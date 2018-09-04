// @flow

// TODO - extract code to a submodule, and reuse in kodi-alexa-video as well

import _ from 'lodash';
import uuid from 'uuid/v4';
import axios from 'axios';

import config from '../config';
import createLogger from '../logging';

import type { AwsRegion } from '../types';

type BaseState = { time: string };
type VolumeState = { name: 'volume', value: number } & BaseState;
type MutedState = { name: 'muted', value: boolean } & BaseState;
type PlayerState = { name: 'player', value: 'stopped' | 'paused' | 'playing' } & BaseState;
type PowerState = { name: 'power', value: boolean } & BaseState;
type KodiState = VolumeState | MutedState | PlayerState | PowerState;

const logger = createLogger('util/alexa');

const PLAYBACK_STATE_MAPPING = {
  stopped: 'STOPPED',
  paused: 'PAUSED',
  playing: 'PLAYING',
};

export function stringifyError(error: Object): ?string {
  const errorData = _.get(error, 'response.data');
  if (!errorData || !errorData.error || !errorData.error_description) return null;

  return `${errorData.error} - ${errorData.error_description}`;
}

export function transformState(state: KodiState): ?Object {
  switch (state.name) {
    case 'volume':
      return {
        namespace: 'Alexa.Speaker',
        name: 'volume',
        value: state.value,
        timeOfSample: state.time,
        uncertaintyInMilliseconds: 0,
      };
    case 'muted':
      return {
        namespace: 'Alexa.Speaker',
        name: 'muted',
        value: state.value,
        timeOfSample: state.time,
        uncertaintyInMilliseconds: 0,
      };
    case 'player':
      return {
        namespace: 'Alexa.PlaybackStateReporter',
        name: 'playbackState',
        value: {
          state: PLAYBACK_STATE_MAPPING[state.value],
        },
        timeOfSample: state.time,
        uncertaintyInMilliseconds: 0,
      };
    case 'power':
      return {
        namespace: 'Alexa.PowerController',
        name: 'powerState',
        value: state.value ? 'ON' : 'OFF',
        timeOfSample: '2017-02-03T16:20:50.52Z',
        uncertaintyInMilliseconds: 0,
      };
    default:
      return null;
  }
}

export function createChangeReportEvent(
  amazonAccessToken: string,
  deviceId: string,
  changedProperty: Object,
  changeCause: 'PHYSICAL_INTERACTION' | 'VOICE_INTERACTION',
  contextProperties: Object[],
): Object {
  const header = {
    messageId: uuid(),
    namespace: 'Alexa',
    name: 'ChangeReport',
    payloadVersion: '3',
  };

  const endpoint = {
    scope: {
      type: 'BearerToken',
      token: amazonAccessToken,
    },
    endpointId: deviceId,
  };

  const payload = {
    change: {
      cause: {
        type: changeCause,
      },
      properties: [changedProperty],
    },
  };

  const context = { properties: contextProperties };

  return {
    context,
    event: {
      header,
      endpoint,
      payload,
    },
  };
}

export async function sendAlexaEvent(region: AwsRegion, event: Object) {
  const url = config.amazonEventGatewayUrl[region];

  if (!url) throw new Error(`Invalid region: ${region}`);

  let response;
  try {
    response = await axios({
      method: 'POST',
      url,
      data: event,
    });
  } catch (error) {
    // TODO - user error log once submited, currently it's failing all the time, and would spam Bugsnag
    logger.warn('Failed to send alexa event', { error, data: error.response && error.response.data });
    return;
  }

  logger.debug('AWS Event gateway response', { responseData: response.data });
}
