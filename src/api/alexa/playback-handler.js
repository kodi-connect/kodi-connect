// @flow

import _ from 'lodash';
import uuid from 'uuid/v4';
import { kodiRpcCommand } from '../../tunnel-server';

import type { AlexaHandlerRequest } from './types';
import type { KodiInstances } from '../../tunnel-server';

export default async function playbackHandler({ event, username }: AlexaHandlerRequest, kodiInstances: KodiInstances) {
  const header = {
    messageId: uuid(),
    name: 'Response',
    namespace: 'Alexa',
    payloadVersion: '3',
    correlationToken: _.get(event, 'directive.header.correlationToken'),
  };

  const payload = {};

  const playbackOperation = _.get(event, 'directive.header.name');
  const endpointId = _.get(event, 'directive.endpoint.endpointId');

  switch (playbackOperation) {
    case 'Next':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'next');
      break;
    case 'Previous':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'previous');
      break;
    case 'StartOver':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'startOver');
      break;
    case 'Play':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'play');
      break;
    case 'Pause':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'pause');
      break;
    case 'Stop':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'stop');
      break;
    case 'Rewind':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'rewind');
      break;
    case 'FastForward':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'fastForward');
      break;
    default:
      throw new Error(`Unknown playback operation: ${playbackOperation}`);
  }

  return { header, payload };
}
