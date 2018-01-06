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
import { getUser } from './users';
import { wrapAsync } from './utils';
import oauthRouter from './routes/oauth';
import kodiRouter from './routes/kodi';
import tunnelServer from './tunnel-server';

const MongoStore = connectMongo(session);

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

// Get login.
app.get('/login', wrapAsync(async (req, res) => {
  res.render('login', req.query);
}));

// Post login.
app.post('/login', wrapAsync(async (req, res) => {
  const user = await getUser(req.body.email, req.body.password);
  if (!user) {
    return res.render('login', req.body);
  }

  console.log('User:', user);

  req.session.user = user;

  const path = req.body.redirect || '/';

  console.log('Redirecting to:', path);

  const queryString = qs.stringify(req.body);

  return res.redirect(`${path}?${queryString}`);
}));

app.get('/', wrapAsync(async (req, res) => {
  if (!req.session.user) {
    res.send('USER NOT LOGGED IN');
    return;
  }
  res.send(`HOME, hello ${_.get(req, 'session.user.username')}`);
}));

server.listen(3005, undefined, undefined, () => {
  console.log('Listening on %d', server.address().port);
});
