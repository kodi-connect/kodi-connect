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
import {
  getUser,
  createUser,
  confirmUserRegistration,
  getDevices,
  removeDevice,
  addDevice,
  addAlexaBetaTest,
  getAlexaBetaTests,
  removeAlexaBetaTest,
} from './users';
import { wrapAsync } from './util/api';
import { validateEmail } from './util/email';
import oauthRouter from './routes/oauth';
import kodiRouter from './routes/kodi';
import alexaRouter from './routes/alexa';
import createTunnelServer from './tunnel-server';
import config from './config';
import createLogger from './logging';
import { accessTokenRequest, accessTokenValid, transformAccessTokenData } from './ask/api';
import { AlexaSkills } from './params';
import {
  addBetaTester,
  addSkill,
  deleteSkill,
  getAlexaSkillsWithBetaTests,
  getSkill,
  getSkillCredentials,
  removeBetaTester,
} from './ask';

const logger = createLogger('index');

const MongoStore = connectMongo(session);

const oauthFields = ['state', 'response_type', 'redirect', 'client_id', 'client_secret', 'redirect_uri'];

mongoose.connect(config.mongoConnectString, (error) => {
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
  secret: config.sessionSecret,
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

function isAdmin(req) {
  return isLoggedIn(req) && req.session.user.admin === true;
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

function isAdminMiddleware(req, res, next) {
  if (!isAdmin(req)) {
    res.redirect('/');
    return;
  }
  next();
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

app.get('/alexa-beta-tests', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  const alexaBetaTests = await getAlexaBetaTests(req.session.user.username);

  res.render(
    'alexa-beta-tests',
    {
      error: _.get(res, 'locals.app.errorMessage'),
      alexaBetaTests,
    },
  );
}));

app.post('/alexa-beta-tests/add', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  const { email } = req.body;
  if (!email || !validateEmail(email)) {
    req.session.errorMessage = 'Invalid email';
    res.redirect('/alexa-beta-tests');
    return;
  }

  try {
    const { skillId, invitationUrl } = await addBetaTester(email);

    await addAlexaBetaTest(req.session.user.username, email, skillId, invitationUrl);
  } catch (error) {
    logger.error('Failed to add beta tester', { error });
    req.session.errorMessage = error.message;
  }

  res.redirect('/alexa-beta-tests');
}));

app.post('/alexa-beta-tests/remove/:email', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  const { email } = req.params;
  if (!email || !validateEmail(email)) {
    req.session.errorMessage = 'Invalid email';
    res.redirect('/alexa-beta-tests');
    return;
  }

  try {
    const skillId = await removeAlexaBetaTest(req.session.user.username, email);
    await removeBetaTester(skillId, email);
  } catch (error) {
    logger.error('Failed to remove beta tester', { error, email });
    req.session.errorMessage = error.message;
  }

  res.redirect('/alexa-beta-tests');
}));

app.get('/terms-of-use/alexa', wrapAsync(async (req, res) => {
  res.render('alexa-terms-of-use', { hostname: req.hostname });
}));

app.get('/privacy-policy/alexa', wrapAsync(async (req, res) => {
  res.render('alexa-privacy-policy', { hostname: req.hostname });
}));

app.get('/admin', isAdminMiddleware, wrapAsync(async (req, res) => {
  const skillIds: string[] = await AlexaSkills.getValue([]);
  const skills = await getAlexaSkillsWithBetaTests(skillIds);
  res.render('admin', { skills, error: _.get(res, 'locals.app.errorMessage') });
}));

// app.post('/admin/alexa-skill/add', isAdminMiddleware, wrapAsync(async (req, res) => {
//   let skillId;
//   try {
//     skillId = await addSkill();
//   } catch (error) {
//     req.session.errorMessage = error.message;
//     res.redirect('/admin');
//     return;
//   }
//   const alexaSkills = await AlexaSkills.getValue([]);
//   await AlexaSkills.setValue([...alexaSkills, skillId]);
//
//   logger.info('Added Alexa skill', { skillId });
//
//   res.redirect('/admin');
// }));
//
// app.post('/admin/alexa-skill/remove/:id', isAdminMiddleware, wrapAsync(async (req, res) => {
//   const { id: skillId } = req.params;
//   await deleteSkill(skillId);
//
//   const alexaSkills = await AlexaSkills.getValue([]);
//   await AlexaSkills.setValue(alexaSkills.filter(id => id !== skillId));
//
//   logger.info('Removed Alexa skill', { skillId });
//
//   res.redirect('/admin');
// }));

app.get('/alexa-skill', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  if (!req.session.lwaCredentials || !accessTokenValid(req.session.lwaCredentials.expires_at)) {
    res.redirect('/alexa-skill/lwa');
    return;
  }

  console.log('LWA Credentials', req.session.lwaCredentials);

  // const vendors = await getVendors(req.session.lwaCredentials);
  // console.log(JSON.stringify(vendors));

  const skill = await getSkill(req.session.lwaCredentials);
  console.log(JSON.stringify(skill, null, '  '));

  const vars = {};

  if (skill) {
    vars.skillCreated = true;
    vars.skill = true;
    const { skillId, manifest } = skill;
    console.log(manifest);

    const skillCredentials = await getSkillCredentials(req.session.lwaCredentials, skillId);
    console.log(skillCredentials);
  }

  console.log(vars);

  res.render('alexa-skill', vars);
}));

app.post('/alexa-skill/create', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  if (!req.session.lwaCredentials || !accessTokenValid(req.session.lwaCredentials.expires_at)) {
    res.redirect('/alexa-skill/lwa');
    return;
  }

  const skillId = await addSkill(req.session.lwaCredentials);
  const skillCredentials = await getSkillCredentials(req.session.lwaCredentials, skillId);
  console.log(skillCredentials);


  res.redirect('/alexa-skill');
}));

app.get('/alexa-skill/lwa', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  // TODO - Check for credentials on the session
  const query = qs.stringify({
    client_id: config.lwaClientId,
    scope: 'alexa::ask:skills:readwrite',
    response_type: 'code',
    redirect_uri: `${config.hostUrl}/alexa-skill/lwa/redirect_uri`,
  });
  res.redirect(`https://www.amazon.com/ap/oa?${query}`);
}));

app.get('/alexa-skill/lwa/redirect_uri', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  try {
    const accessTokenData = await accessTokenRequest(req.query.code);

    req.session.lwaCredentials = transformAccessTokenData(accessTokenData);
  } catch (error) {
    logger.error('Failed to get Amazon tokens', { error, responseData: error.response && error.response.data });
  }

  res.redirect('/alexa-skill');
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
