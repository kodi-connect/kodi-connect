// @flow

import _ from 'lodash';
import uuid from 'uuid/v4';

import { validateAwsRegion } from '../../type-validation';
import createLogger from '../../logging';
import type { AwsRegion } from '../../types';
import type { AlexaHandlerRequest } from './types';

const logger = createLogger('api/alexa/authorization-handler');

async function authorizeUser(accessToken: string, code: string, region: AwsRegion) {
  logger.debug(`Authorize user: ${accessToken}, ${code}, ${region}`);

  // let tokens;
  // try {
  //   tokens = await amazon.getUserAuthTokens(region, code);
  // } catch (error) {
  //   logger.error('Failed to get amazon tokens', { error, username, region });
  //   // res.sendStatus(400);
  //   res.sendStatus(200); // FIXME - this is because people are connecting from 2 different skills
  //   return;
  // }

  // await storeAmazonTokens(username, tokens);
}

export default async function authorizationHandler({ event, meta, username }: AlexaHandlerRequest) {
  const authorizationOperation = _.get(event, 'directive.header.name');

  switch (authorizationOperation) {
    case 'AcceptGrant': {
      const grantCode = _.get(event, 'directive.payload.grant.code');
      const granteeToken = _.get(event, 'directive.payload.grantee.token');
      const regionValue = _.get(meta, 'region');
      let region: AwsRegion;

      try {
        region = validateAwsRegion(meta.region);
        await authorizeUser(granteeToken, grantCode, region);
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
