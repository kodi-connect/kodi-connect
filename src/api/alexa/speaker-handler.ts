import _ from 'lodash'
import { v4 as uuid } from 'uuid'
import { asyncKodiRpcCommand } from '../../tunnel-server'

import { AlexaRequest } from './types'
import { KodiInstances } from '../../tunnel-server'

export default async function playbackHandler(
  { event, username }: AlexaRequest,
  kodiInstances: KodiInstances
) {
  const speakerOperation = _.get(event, 'directive.header.name')
  const endpointId = _.get(event, 'directive.endpoint.endpointId')

  switch (speakerOperation) {
    case 'SetVolume':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'setVolume', {
        volume: _.get(event, 'directive.payload.volume', 0),
      })
      break
    case 'AdjustVolume':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'adjustVolume', {
        volume: _.get(event, 'directive.payload.volume', 0),
      })
      break
    case 'SetMute':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'setMute', {
        mute: _.get(event, 'directive.payload.mute', 0),
      })
      break
    default:
      throw new Error(`Unknown speaker operation: ${speakerOperation}`)
  }

  const header = {
    messageId: uuid(),
    correlationToken: _.get(event, 'directive.header.correlationToken'),
    namespace: 'Alexa',
    name: 'Response',
    payloadVersion: '3',
  }
  const payload = {}

  return { header, payload }
}
