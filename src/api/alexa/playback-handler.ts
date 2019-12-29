import _ from 'lodash'
import uuid from 'uuid/v4'
import { asyncKodiRpcCommand } from '../../tunnel-server'

import { AlexaRequest } from './types'
import { KodiInstances } from '../../tunnel-server'

export default async function playbackHandler(
  { event, username }: AlexaRequest,
  kodiInstances: KodiInstances
) {
  const header = {
    messageId: uuid(),
    name: 'Response',
    namespace: 'Alexa',
    payloadVersion: '3',
    correlationToken: _.get(event, 'directive.header.correlationToken'),
  }

  const payload = {}

  const playbackOperation = _.get(event, 'directive.header.name')
  const endpointId = _.get(event, 'directive.endpoint.endpointId')

  switch (playbackOperation) {
    case 'Next':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'next')
      break
    case 'Previous':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'previous')
      break
    case 'StartOver':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'startOver')
      break
    case 'Play':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'play')
      break
    case 'Pause':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'pause')
      break
    case 'Stop':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'stop')
      break
    case 'Rewind':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'rewind')
      break
    case 'FastForward':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'fastForward')
      break
    default:
      throw new Error(`Unknown playback operation: ${playbackOperation}`)
  }

  return { header, payload }
}
