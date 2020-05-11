import _ from 'lodash'
import { v4 as uuid } from 'uuid'
import { kodiRpcCommand } from '../../tunnel-server'

import { AlexaRequest } from './types'
import { KodiInstances } from '../../tunnel-server'

export default async function seekControllerHandler(
  { event, username }: AlexaRequest,
  kodiInstances: KodiInstances
) {
  const speakerOperation = _.get(event, 'directive.header.name')
  const endpointId = _.get(event, 'directive.endpoint.endpointId')

  let responseData

  switch (speakerOperation) {
    case 'AdjustSeekPosition':
      responseData = await kodiRpcCommand(kodiInstances, username, endpointId, 'seek', {
        deltaPosition: _.get(event, 'directive.payload.deltaPositionMilliseconds', 0) / 1000,
      })
      break
    default:
      throw new Error(`Unknown speaker operation: ${speakerOperation}`)
  }

  const { positionMilliseconds } = responseData

  const payload = {
    properties: [
      {
        name: 'positionMilliseconds',
        value: positionMilliseconds,
      },
    ],
  }

  const header = {
    messageId: uuid(),
    correlationToken: _.get(event, 'directive.header.correlationToken'),
    namespace: 'Alexa.SeekController',
    name: 'StateReport',
    payloadVersion: '3',
  }

  return { header, payload }
}
