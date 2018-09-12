// @flow

import http from 'http';
import qs from 'querystring';
import _ from 'lodash';
import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import OAuthServer from 'express-oauth-server';
import connectMongo from 'connect-mongo';
import mongoose from 'mongoose';
import bugsnag from 'bugsnag';
import * as OAuthModel from './oauth-model';
import { getUser, createUser, confirmUserRegistration, getDevices, removeDevice, addDevice } from './users';
import { wrapAsync } from './util/api';
import oauthRouter from './routes/oauth';
import kodiRouter from './routes/kodi';
import alexaRouter from './routes/alexa';
import createTunnelServer from './tunnel-server';
import config from './config';
import createLogger from './logging';

const logger = createLogger('index');

const MongoStore = connectMongo(session);

const oauthFields = ['state', 'response_type', 'redirect', 'client_id', 'client_secret', 'redirect_uri'];

const mongoConnectString = process.env.MONGO_URL;
if (!mongoConnectString) throw new Error('MONGO_URL not defined');
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'development' && 'TopSecret');
if (!sessionSecret) throw new Error('SESSION_SECRET not defined');

mongoose.connect(mongoConnectString, (error) => {
  if (error) {
    logger.error('ERROR connecting to MongoDB', { error });
  } else {
    logger.info('Successfully connected to MongoDB');
  }
});

bugsnag.register(config.bugsnag.key, {
  notifyReleaseStages: ['production'],
  releaseStage: 'production',
});

const app = express();
const server = http.createServer(app);

app.use('/static', express.static('static'));

const kodiInstances = createTunnelServer(server, '/ws');

app.set('view engine', 'pug');

app.use(session({
  secret: sessionSecret,
  store: new MongoStore({
    mongooseConnection: mongoose.connection,
  }),
  saveUninitialized: false,
  resave: false,
}));

app.use((req, res, next) => {
  if (req.session.errorMessage) {
    _.set(res, 'locals.app.errorMessage', req.session.errorMessage);
    req.session.errorMessage = undefined;
  }

  next();
});

app.oauth = new OAuthServer({
  model: OAuthModel,
  debug: process.env.NODE_ENV === 'development',
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/oauth', oauthRouter(app.oauth));
app.use('/kodi', kodiRouter(app.oauth, kodiInstances));
app.use('/alexa', alexaRouter(app.oauth));

function isLoggedIn(req) {
  return !!req.session.user;
}

function isLoggedInMiddleware(shouldBeLoggedIn: boolean) {
  return (req, res, next) => {
    if (isLoggedIn(req) !== shouldBeLoggedIn) {
      res.redirect('/');
      return;
    }
    next();
  };
}

app.get('/login', isLoggedInMiddleware(false), wrapAsync(async (req, res) => {
  logger.info('LOGIN', req.query);
  res.render('login', { ...req.query, error: _.get(res, 'locals.app.errorMessage') });
}));

app.post('/login', wrapAsync(async (req, res) => {
  const username = req.body.email && req.body.email.toLowerCase();
  const { password } = req.body;

  if (!username || !password) {
    req.session.errorMessage = 'Missing username and/or password';
    const queryString = qs.stringify(_.pick(req.body, oauthFields));
    res.redirect(`/login?${queryString}`);
    return;
  }

  const user = await getUser(username, password);
  if (!user) {
    res.render('login', { ..._.pick(req.body, oauthFields), error: 'Failed to log in' });
    return;
  }

  logger.info('User:', { user });

  req.session.user = user;

  const path = req.body.redirect || '/';

  logger.info('Redirecting', { path });

  const queryString = qs.stringify(_.pick(req.body, oauthFields));

  res.redirect(`${path}?${queryString}`);
}));

app.post('/logout', wrapAsync(async (req, res) => {
  req.session.user = undefined;
  res.redirect('/login');
}));

app.get('/register', isLoggedInMiddleware(false), wrapAsync(async (req, res) => {
  res.render('register', { error: _.get(res, 'locals.app.errorMessage') });
}));

function validateEmail(email: string) {
  if (email.length === 0) return false;
  return true;
}

function validatePassword(password: string) {
  if (password.length === 0) return false;
  return true;
}

app.post('/register', wrapAsync(async (req, res) => {
  logger.info('Registering user', { email: req.body.email });

  const email = req.body.email && req.body.email.toLowerCase().trim();
  const password = req.body.password && req.body.password.trim();
  const repeatPassword = req.body.repeatPassword && req.body.repeatPassword.trim();

  if (!email || !password || !repeatPassword
    || !validateEmail(email) || !validatePassword(password) || !validatePassword(repeatPassword)
    || password !== repeatPassword
  ) {
    req.session.errorMessage = 'Invalid values';
    res.redirect('/register');
    return;
  }

  const result = await createUser(email, password);

  switch (result) {
    case 'created':
      res.render('check-email');
      break;
    case 'email_duplicity':
      logger.info('Email duplicity', { email });
      req.session.errorMessage = 'Email duplicity';
      res.redirect('/register');
      break;
    default:
      throw new Error(`Unknown RegistrationResult: ${result}`);
  }
}));

app.get('/confirm/:confirmationToken', wrapAsync(async (req, res) => {
  const result = await confirmUserRegistration(req.params.confirmationToken);
  logger.info('User registration confirmation', { confirmationToken: req.params.confirmationToken, result });

  switch (result) {
    case 'confirmed':
      res.render('confirmed');
      break;
    case 'already_confirmed':
      res.render('confirmed'); // TODO - use different one
      break;
    case 'not_found':
      res.sendStatus(400);
      break;
    default:
      throw new Error(`Unknown ConfirmationResult: ${result}`);
  }
}));

app.get('/devices', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  const devices = await getDevices(req.session.user.username);

  res.render('devices', { devices, error: _.get(res, 'locals.app.errorMessage') });
}));

app.post('/device/add', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  if (!req.body.name) {
    req.session.errorMessage = 'Device name missing';
    res.redirect('/devices');
    return;
  }

  const { errorMessage } = await addDevice(req.session.user.username, req.body.name);

  if (errorMessage) {
    logger.info('Failed to add device', { errorMessage });
    req.session.errorMessage = errorMessage;
    res.redirect('/devices');
    return;
  }

  res.redirect('/devices');
}));

app.post('/device/remove/:id', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  await removeDevice(req.session.user.username, req.params.id);
  res.redirect('/devices');
}));

app.get('/terms-of-use/alexa', wrapAsync(async (req, res) => {
  res.render('alexa-terms-of-use', { hostname: req.hostname });
}));

app.get('/privacy-policy/alexa', wrapAsync(async (req, res) => {
  res.render('alexa-privacy-policy', { hostname: req.hostname });
}));

app.get('/', wrapAsync(async (req, res) => {
  if (!isLoggedIn(req)) {
    res.render('home');
    return;
  }
  res.redirect('/devices');
}));

server.listen(3005, undefined, undefined, () => {
  logger.info('Server listening', { port: server.address().port });
});
