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
import * as OAuthModel from './oauth-model';
import { getUser, createUser, confirmUserRegistration, getDevices, removeDevice, addDevice } from './users';
import { wrapAsync } from './utils';
import oauthRouter from './routes/oauth';
import kodiRouter from './routes/kodi';
import tunnelServer from './tunnel-server';

const MongoStore = connectMongo(session);

const oauthFields = ['state', 'response_type', 'redirect', 'client_id', 'redirect_uri'];

const mongoConnectString = process.env.MONGO_URL;
if (!mongoConnectString) throw new Error('MONGO_URL not defined');
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'development' && 'TopSecret');
if (!sessionSecret) throw new Error('SESSION_SECRET not defined');

mongoose.connect(mongoConnectString, (error) => {
  if (error) {
    console.log('ERROR connecting to MongoDB', error);
  } else {
    console.log('Successfully connected to MongoDB');
  }
});

const app = express();
const server = http.createServer(app);

app.use('/static', express.static('static'));

const kodiInstances = tunnelServer(server);

app.set('view engine', 'pug');

app.use(session({
  secret: sessionSecret,
  store: new MongoStore({
    mongooseConnection: mongoose.connection,
  }),
  saveUninitialized: false,
  resave: false,
}));

app.oauth = new OAuthServer({
  model: OAuthModel,
  debug: process.env.NODE_ENV === 'development',
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/oauth', oauthRouter(app.oauth));
app.use('/kodi', kodiRouter(app.oauth, kodiInstances));

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
  console.log('LOGIN', req.query);
  res.render('login', req.query);
}));

app.post('/login', wrapAsync(async (req, res) => {
  const user = await getUser(req.body.email, req.body.password);
  if (!user) {
    // TODO - render login error message
    res.render('login', _.pick(req.body, oauthFields)); // TODO - change this to use pick instead of omit !!!
    return;
  }

  console.log('User:', user);

  req.session.user = user;

  const path = req.body.redirect || '/';

  console.log('Redirecting to:', path);

  const queryString = qs.stringify(_.pick(req.body, oauthFields)); // TODO - change this to use pick instead of omit !!!

  res.redirect(`${path}?${queryString}`);
}));

app.post('/logout', wrapAsync(async (req, res) => {
  req.session.user = undefined;
  res.redirect('/login');
}));

app.get('/register', isLoggedInMiddleware(false), wrapAsync(async (req, res) => {
  res.render('register');
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
  console.log('REGISTER');
  console.log(req.body);
  if (!req.body
    || !req.body.email || !req.body.password
    || !validateEmail(req.body.email) || !validatePassword(req.body.password)
  ) {
    // TODO - render register error
    res.render('login', _.omit(req.body, ['email', 'password']));
    return;
  }

  const created = await createUser(req.body.email, req.body.password);
  if (created.error) {
    // TODO - render register error
    res.render('register', { error: created.error });
    return;
  }

  res.render('check-email');
}));

app.get('/confirm/:confirmationToken', wrapAsync(async (req, res) => {
  const status = await confirmUserRegistration(req.params.confirmationToken);
  console.log('status:', status);

  switch (status) {
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
      throw new Error('Unknown ConfirmationResult');
  }
}));

app.get('/devices', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  const devices = await getDevices(req.session.user.username);

  res.render('devices', { devices });
}));

app.post('/device/add', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  if (!req.body.name) {
    console.log('name missing');
    res.redirect('/devices'); // TODO - render 'devices' with error
    return;
  }

  const { devices, error } = await addDevice(req.session.user.username, req.body.name);

  if (error) {
    console.log('Failed to add device:', error);
    res.redirect('/devices'); // TODO - render 'devices' with error
    return;
  }

  res.render('devices', { devices });
}));

app.post('/device/remove/:id', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  const devices = await removeDevice(req.session.user.username, req.params.id);
  res.render('devices', { devices });
}));

app.get('/', wrapAsync(async (req, res) => {
  if (!isLoggedIn(req)) {
    res.render('home');
    return;
  }
  res.redirect('/devices');
}));

server.listen(3005, undefined, undefined, () => {
  console.log('Listening on %d', server.address().port);
});
