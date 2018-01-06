// @flow

import http from 'http';
import qs from 'querystring';
import _ from 'lodash';
import bodyParser from 'body-parser';
import express from 'express';
import session from 'express-session';
import OAuthServer from 'express-oauth-server';
import connectMongo from 'connect-mongo';
import { Server as WsServer } from 'ws';
import mongoose from 'mongoose';
import * as OAuthModel from './oauth-model';
import { getUser, getDevice, getDevices, isUsersDevice } from './users';
import createTunnel from './tunnel';
import { wrapAsync } from './utils';

const MongoStore = connectMongo(session);

const mongoConnectString = process.env.MONGO_URL;
if (!mongoConnectString) throw new Error('MONGO_URL not defined');
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'development' && 'TopSecret');
if (!sessionSecret) throw new Error('SESSION_SECRET not defined');

// Makes connection asynchronously. Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(mongoConnectString, (err) => {
  if (err) {
    console.log(`ERROR connecting to: ${mongoConnectString}, ${err}`);
  } else {
    console.log(`Succeeded connected to: ${mongoConnectString}`);
  }
});

const app = express();
const server = http.createServer(app);
const wss = new WsServer({ server, clientTracking: true, path: '/ws' });

const kodiInstances = {};

wss.on('connection', (ws) => {
  console.log('kodi connected');

  ws.once('message', (msgStr) => {
    try {
      const msg = JSON.parse(msgStr);
      if (!msg) throw new Error('Invalid message format, expected JSON');
      if (!msg.username || !msg.secret) throw new Error('Missing username and/or secret');

      getDevice(msg.username, msg.secret).then((deviceId) => {
        console.log('Device found:', deviceId);
        if (!deviceId) {
          ws.close();
          return;
        }

        kodiInstances[deviceId] = {
          rpc: createTunnel(ws),
          close: () => ws.close(),
        };
      }, (error) => {
        console.warn('Failed to get device:', error);
        ws.close();
      });
    } catch (error) {
      console.error('Kodi registration error:', error);
      ws.close();
    }
  });

  ws.on('close', (code, reason) => {
    console.log('kodi disconnected', code, reason);
  });
});

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

// Post token.
app.post('/oauth/token', app.oauth.token());

// Get authorization.
app.get('/oauth/authorize', (req, res) => {
  console.log('AUTHORIZE GET', req.query);

  // Redirect anonymous users to login page.
  if (!req.session.user) {
    const queryString = qs.stringify({
      redirect: req.path,
      ...req.query,
    });
    res.redirect(`/login?${queryString}`);
    return;
  }

  console.log('User logged in:', req.session.user);

  res.render('authorize', req.query);
});

app.post('/oauth/authorize', (req, res, next) => {
  console.log('AUTHORIZE POST', req.body);

  if (req.body.logout !== undefined) {
    req.session.user = undefined;
    res.send('Logged out');
    return;
  }

  next();
});

app.post('/oauth/authorize', app.oauth.authorize({
  authenticateHandler: {
    handle: (req) => {
      console.log('Returning user:', req.session.user);
      return req.session.user ? { username: req.session.user.username } : null;
    },
  },
}));

// Get login.
app.get('/login', (req, res) => {
  console.log('LOGIN GET', req.query);

  res.render('login', req.query);
});

// Post login.
app.post('/login', wrapAsync(async (req, res) => {
  console.log('LOGIN POST', req.query);
  console.log('LOGIN POST', req.body);

  const user = await getUser(req.body.email, req.body.password);
  if (!user) {
    return res.render('login', req.body);
  }

  console.log('User:', user);

  req.session.user = user;

  const path = req.body.redirect || '/home';

  console.log('Redirecting to:', path);

  const queryString = qs.stringify(req.body);

  return res.redirect(`${path}?${queryString}`);
}));

app.get('/redirect_uri', (req, res) => {
  console.log('REDIRECT_URI', req.query);
  res.send('OK');
});

app.get('/kodi/discovery', app.oauth.authenticate(), wrapAsync(async (req, res) => {
  const username = _.get(res, 'locals.oauth.token.user.username');

  const devices = _.pick(await getDevices(username), ['id', 'name']);
  console.log('Devices:', devices);
  res.json(devices);
}));

app.post('/kodi/rpc', app.oauth.authenticate(), wrapAsync(async (req, res) => {
  const username = _.get(res, 'locals.oauth.token.user.username');

  if (!req.body || !req.body.id || !req.body.rpc) {
    res.sendStatus(403);
    return;
  }

  const validDevice = await isUsersDevice(username, req.body.id);
  if (!validDevice) {
    res.sendStatus(401);
    return;
  }

  console.log(kodiInstances);

  if (!kodiInstances[req.body.id]) {
    res.sendStatus(404);
    return;
  }

  console.log('Sending message to kodi:');
  console.log(req.body.rpc);

  const rpcRes = await kodiInstances[req.body.id].rpc(req.body.rpc);
  console.log('rpcRes:', rpcRes);
  res.json(rpcRes);
}));

server.listen(3005, undefined, undefined, () => {
  console.log('Listening on %d', server.address().port);
});
