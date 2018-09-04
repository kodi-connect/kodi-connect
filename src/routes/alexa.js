// @flow

import _ from 'lodash';
import { Router } from 'express';

import * as amazon from '../amazon';
import { storeAmazonTokens } from '../users';

import { wrapAsync } from '../util/api';
import { validateAwsRegion } from '../type-validation';
import createLogger from '../logging';

import type { AwsRegion } from '../types';

const logger = createLogger('routes/alexa');

export default function createAlexaRouter(oauth: Object) {
  const router = new Router({ mergeParams: true });

  router.post('/authorize', oauth.authenticate(), wrapAsync(async (req, res) => {
    const username = _.get(res, 'locals.oauth.token.user.username');
    const regionValue = _.get(req, 'body.region');

    logger.debug('Authorize user', { username, body: req.body });

    const code = _.get(req, 'body.code');

    let region: AwsRegion;

    try {
      region = validateAwsRegion(regionValue);
    } catch (error) {
      logger.error('Invalid aws region', { error, username, regionValue });
      res.sendStatus(400);
      return;
    }

    if (!code) {
      res.sendStatus(400);
      return;
    }

    let tokens;
    try {
      tokens = await amazon.getUserAuthTokens(region, code);
    } catch (error) {
      logger.error('Failed to get amazon tokens', { error, username, region });
      res.sendStatus(400);
      return;
    }

    await storeAmazonTokens(username, tokens);

    res.sendStatus(200);
  }));

  return router;
}
