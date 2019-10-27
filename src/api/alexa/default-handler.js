// @flow

import _ from 'lodash';
import uuid from 'uuid/v4';
import { kodiRpcCommand } from '../../tunnel-server';

import type { AlexaRequest } from './types';
import type { KodiInstances } from '../../tunnel-server';
import { transformState } from '../../util/alexa';

type BaseState = { time: string };
type VolumeState = { name: 'volume', value: number } & BaseState;
type MutedState = { name: 'muted', value: boolean } & BaseState;
type PlayerState = { name: 'player', value: 'stopped' | 'paused' | 'playing' } & BaseState;
type PowerState = { name: 'power', value: boolean } & BaseState;
type KodiState = VolumeState | MutedState | PlayerState | PowerState;

async function getState(kodiInstances: KodiInstances, username: string, endpointId: string): Promise<KodiState[]> {
  const response = await kodiRpcCommand(kodiInstances, username, endpointId, 'state');
  const time = (new Date()).toISOString();
  return response.state.map(state => ({ ...state, time }));
}

async function stateReportHandler({ event, username }: AlexaRequest, kodiInstances: KodiInstances) {
  const header = {
    messageId: uuid(),
    namespace: 'Alexa',
    name: 'StateReport',
    correlationToken: _.get(event, 'directive.header.correlationToken'),
    payloadVersion: '3',
  };

  const endpointId = _.get(event, 'directive.endpoint.endpointId');

  const endpoint = {
    ..._.get(event, 'directive.endpoint'),
  };

  const payload = {};

  const stateList = await getState(kodiInstances, username, endpointId);
  const properties = stateList.reduce((acc, state) => {
    const property = transformState(state);
    if (!property) return acc;
    return [...acc, property];
  }, []);

  const context = { properties };

  return {
    context,
    header,
    endpoint,
    payload,
  };
}

export default async function defaultHandler(alexaHandlerEvent: AlexaRequest, kodiInstances: KodiInstances) {
  const eventName = _.get(alexaHandlerEvent, 'event.directive.header.name');

  switch (eventName) {
    case 'ReportState':
      return stateReportHandler(alexaHandlerEvent, kodiInstances);
    default:
      throw new Error(`Unknown event name: ${eventName}`);
  }
}
