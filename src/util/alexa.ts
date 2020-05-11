// TODO - extract code to a submodule, and reuse in kodi-alexa-video as well

import _ from 'lodash'
import { v4 as uuid } from 'uuid'
import axios from 'axios'

import config from '../config'
import createLogger from '../logging'

import { AwsRegion } from '../types'
import { REGION_GATEWAY_MAP } from '../ask/constants'

type BaseState = { time: string }
type VolumeState = { name: 'volume'; value: number } & BaseState
type MutedState = { name: 'muted'; value: boolean } & BaseState
type PlayerState = { name: 'player'; value: 'stopped' | 'paused' | 'playing' } & BaseState
type PowerState = { name: 'power'; value: boolean } & BaseState
type KodiState = VolumeState | MutedState | PlayerState | PowerState

const logger = createLogger('util/alexa')

const PLAYBACK_STATE_MAPPING = {
  stopped: 'STOPPED',
  paused: 'PAUSED',
  playing: 'PLAYING',
}

export function stringifyError(error: Record<string, any>): string | null | undefined {
  const errorData = _.get(error, 'response.data')
  if (!errorData || !errorData.error || !errorData.error_description) return null

  return `${errorData.error} - ${errorData.error_description}`
}

export function transformState(state: KodiState): Record<string, any> | null | undefined {
  switch (state.name) {
    case 'volume':
      return {
        namespace: 'Alexa.Speaker',
        name: 'volume',
        value: state.value,
        timeOfSample: state.time,
        uncertaintyInMilliseconds: 0,
      }
    case 'muted':
      return {
        namespace: 'Alexa.Speaker',
        name: 'muted',
        value: state.value,
        timeOfSample: state.time,
        uncertaintyInMilliseconds: 0,
      }
    case 'player':
      return {
        namespace: 'Alexa.PlaybackStateReporter',
        name: 'playbackState',
        value: {
          state: PLAYBACK_STATE_MAPPING[state.value],
        },
        timeOfSample: state.time,
        uncertaintyInMilliseconds: 0,
      }
    case 'power':
      return {
        namespace: 'Alexa.PowerController',
        name: 'powerState',
        value: state.value ? 'ON' : 'OFF',
        timeOfSample: '2017-02-03T16:20:50.52Z',
        uncertaintyInMilliseconds: 0,
      }
    default:
      return null
  }
}

export function createChangeReportEvent(
  amazonAccessToken: string,
  deviceId: string,
  changedProperty: Record<string, any>,
  changeCause: 'PHYSICAL_INTERACTION' | 'VOICE_INTERACTION',
  contextProperties: Record<string, any>[]
): Record<string, any> {
  const header = {
    messageId: uuid(),
    namespace: 'Alexa',
    name: 'ChangeReport',
    payloadVersion: '3',
  }

  const endpoint = {
    scope: {
      type: 'BearerToken',
      token: amazonAccessToken,
    },
    endpointId: deviceId,
  }

  const payload = {
    change: {
      cause: {
        type: changeCause,
      },
      properties: [changedProperty],
    },
  }

  const context = { properties: contextProperties }

  return {
    context,
    event: {
      header,
      endpoint,
      payload,
    },
  }
}

export async function sendAlexaEvent(region: AwsRegion, event: Record<string, any>) {
  const alexaGatewayRegion = REGION_GATEWAY_MAP[region]
  if (!alexaGatewayRegion) {
    logger.error('Failed to map AwsRegion to AwsAlexaGatewayRegion', { region })
    return
  }
  const url = config.amazonEventGatewayUrl[alexaGatewayRegion]

  if (!url) throw new Error(`Invalid region: ${alexaGatewayRegion}`)

  let response
  try {
    response = await axios({
      method: 'POST',
      url,
      data: event,
    })
  } catch (error) {
    // TODO - use error log once submited, currently it's failing all the time, and would spam Bugsnag
    logger.warn('Failed to send alexa event', {
      error,
      data: error.response && error.response.data,
      region,
      event,
    })
    return
  }

  logger.debug('AWS Event gateway response', { responseData: response.data })
}
