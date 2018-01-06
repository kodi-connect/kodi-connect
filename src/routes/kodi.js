// @flow

import _ from 'lodash';
import { Router } from 'express';

import { getDevices, isUsersDevice } from '../users';
import { wrapAsync } from '../utils';

export default function createOAuthRouter(oauth: Object, kodiInstances: Object) {
  const router = new Router({ mergeParams: true });

  router.get('/discovery', oauth.authenticate(), wrapAsync(async (req, res) => {
    const username = _.get(res, 'locals.oauth.token.user.username');

    const devices = _.pick(await getDevices(username), ['id', 'name']);
    console.log('Devices:', devices);
    res.json(devices);
  }));

  router.post('/rpc', oauth.authenticate(), wrapAsync(async (req, res) => {
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

  return router;
}

