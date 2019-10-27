// @flow

import _ from 'lodash';
import uuid from 'uuid/v4';

import { validateAwsRegion } from '../../type-validation';
import createLogger from '../../logging';
import type { AwsRegion } from '../../types';
import type { AlexaRequest } from './types';
import * as amazon from '../../amazon';
import { storeAmazonTokens } from '../../users';

const logger = createLogger('api/alexa/authorization-handler');

async function authorizeUser(username: string, code: string, region: AwsRegion) {
  logger.debug(`Authorize user: ${username} ${code}, ${region}`);

  let tokens;
  try {
    tokens = await amazon.getUserAuthTokens(username, region, code);
  } catch (error) {
    logger.error('Failed to get amazon tokens', { error, username, region });
    return;
  }

  await storeAmazonTokens(username, tokens);
}

export default async function authorizationHandler({ event, meta, username }: AlexaRequest) {
  const authorizationOperation = _.get(event, 'directive.header.name');

  switch (authorizationOperation) {
    case 'AcceptGrant': {
      const grantCode = _.get(event, 'directive.payload.grant.code');
      const regionValue = _.get(meta, 'region', 'us-east-1').split('-')[0];
      let region: AwsRegion;

      try {
        region = validateAwsRegion(meta.region);
        await authorizeUser(username, grantCode, region);
      } catch (error) {
        logger.error('Invalid aws region', { error, username, regionValue });
      }

      break;
    }
    default:
      throw new Error(`Unknown authorization operation: ${authorizationOperation}`);
  }

  const header = {
    messageId: uuid(),
    name: 'AcceptGrant.Response',
    namespace: 'Alexa.Authorization',
    payloadVersion: '3',
  };

  const payload = {};

  return { header, payload };
}
