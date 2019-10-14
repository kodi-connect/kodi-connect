// @flow

import { Router } from 'express';
import createLogger from '../logging';
import { isLoggedInMiddleware } from './util';
import { wrapAsync } from '../util/api';
import { addDevice, removeDevice } from '../users';

const logger = createLogger('routes/devices');

const router = new Router({ mergeParams: true });

router.post('/add', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
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

router.post('/remove/:id', isLoggedInMiddleware(true), wrapAsync(async (req, res) => {
  await removeDevice(req.session.user.username, req.params.id);
  res.redirect('/devices');
}));

export default router;
