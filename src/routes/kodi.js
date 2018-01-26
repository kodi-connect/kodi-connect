// @flow

import _ from 'lodash';
import { Router } from 'express';

import { getDevices, isUsersDevice } from '../users';
import { wrapAsync } from '../utils';
import createLogger from '../logging';

const logger = createLogger('routes/kodi');

export default function createOAuthRouter(oauth: Object, kodiInstances: Object) {
  const router = new Router({ mergeParams: true });

  router.get('/discovery', oauth.authenticate(), wrapAsync(async (req, res) => {
    const username = _.get(res, 'locals.oauth.token.user.username');

    const devices = (await getDevices(username)).map(d => _.pick(d, ['id', 'name']));
    logger.info('Devices', { username, devices });
    res.json(devices);
  }));

  router.post('/rpc', oauth.authenticate(), wrapAsync(async (req, res) => {
    const username = _.get(res, 'locals.oauth.token.user.username');

    if (!req.body || !req.body.id || !req.body.rpc) {
      res.sendStatus(403);
      return;
    }

    if (!kodiInstances[req.body.id]) {
      res.json({ status: 'error', error: 'device_unreachable' });
      return;
    }

    const validDevice = await isUsersDevice(username, req.body.id);
    if (!validDevice) {
      logger.warn('Not a users device:', { username, id: req.body.id });
      res.sendStatus(400);
      return;
    }

    logger.info('Sending message to kodi', { id: req.body.id, rpc: req.body.rpc });

    const rpcRes = await kodiInstances[req.body.id].rpc(req.body.rpc);
    logger.info('Response message from kodi', { id: req.body.id, rpc: rpcRes });
    res.json(rpcRes);
  }));

  return router;
}

