// @flow

import _ from 'lodash';
import uuid from 'uuid/v4';
import { kodiRpcCommand } from '../../tunnel-server';

import type { AlexaHandlerRequest } from './types';
import type { KodiInstances } from '../../tunnel-server';

type PowerState = 'ON' | 'OFF';

function createPowerStateProperty(powerState: PowerState): Object {
  return {
    namespace: 'Alexa.PowerController',
    name: 'powerState',
    value: powerState,
    timeOfSample: (new Date()).toISOString(),
    uncertaintyInMilliseconds: 500,
  };
}

export default async function powerControllerHandler({ event, username }: AlexaHandlerRequest, kodiInstances: KodiInstances) {
  const header = {
    messageId: uuid(),
    name: 'Response',
    namespace: 'Alexa',
    payloadVersion: '3',
    correlationToken: _.get(event, 'directive.header.correlationToken'),
  };

  const endpoint = {
    ..._.get(event, 'directive.endpoint'),
  };

  const payload = {};

  const powerOperation = _.get(event, 'directive.header.name');
  const endpointId = _.get(event, 'directive.endpoint.endpointId');

  let powerState: PowerState;

  switch (powerOperation) {
    case 'TurnOff':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'turnOff');
      powerState = 'OFF';
      break;
    case 'TurnOn':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'turnOn');
      powerState = 'ON';
      break;
    default:
      throw new Error(`Unknown power operation: ${powerOperation}`);
  }

  const context = powerState && ({ properties: [createPowerStateProperty(powerState)] });

  return {
    context,
    header,
    endpoint,
    payload,
  };
}
