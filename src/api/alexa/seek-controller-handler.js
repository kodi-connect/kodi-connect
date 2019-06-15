// @flow

import _ from 'lodash';
import uuid from 'uuid/v4';
import { kodiRpcCommand } from '../../tunnel-server';

import type { AlexaHandlerRequest } from './types';
import type { KodiInstances } from '../../tunnel-server';

export default async function seekControllerHandler({ event, username }: AlexaHandlerRequest, kodiInstances: KodiInstances) {
  const speakerOperation = _.get(event, 'directive.header.name');
  const endpointId = _.get(event, 'directive.endpoint.endpointId');

  let responseData;

  switch (speakerOperation) {
    case 'AdjustSeekPosition':
      responseData = await kodiRpcCommand(
        kodiInstances,
        username,
        endpointId,
        'seek',
        { deltaPosition: _.get(event, 'directive.payload.deltaPositionMilliseconds', 0) / 1000 },
      );
      break;
    default:
      throw new Error(`Unknown speaker operation: ${speakerOperation}`);
  }

  const { positionMilliseconds } = responseData;

  const payload = {
    properties: [{
      name: 'positionMilliseconds',
      value: positionMilliseconds,
    }],
  };

  const header = {
    messageId: uuid(),
    correlationToken: _.get(event, 'directive.header.correlationToken'),
    namespace: 'Alexa.SeekController',
    name: 'StateReport',
    payloadVersion: '3',
  };

  return { header, payload };
}
