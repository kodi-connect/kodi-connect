// @flow

import http from 'http';
import _ from 'lodash';
import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import OAuthServer from 'express-oauth-server';
import connectMongo from 'connect-mongo';
import mongoose from 'mongoose';
import bugsnag from 'bugsnag';
import * as OAuthModel from './oauth-model';
import oauthRouter from './routes/oauth';
import templatesRouter from './routes/templates';
import authRouter from './routes/auth';
import devicesRouter from './routes/devices';
import alexaSkillRouter from './routes/alexa-skill';
import createTunnelServer from './tunnel-server';
import config from './config';
import createLogger from './logging';
import createAlexaRouter from './api/alexa';
import { isLoggedInMiddleware } from './routes/util';

const logger = createLogger('index');

mongoose.set('debug', true);
const MongoStore = connectMongo(session);

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
app.use(templatesRouter);
app.use(authRouter);
app.use('/device', devicesRouter);
app.use('/alexa-skill', isLoggedInMiddleware(true), alexaSkillRouter);
app.use('/alexa', createAlexaRouter(app.oauth, kodiInstances));

server.listen(3005, undefined, undefined, () => {
  logger.info('Server listening', { port: server.address().port });
});
