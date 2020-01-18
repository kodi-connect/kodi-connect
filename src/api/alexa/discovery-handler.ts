import _ from 'lodash'
import uuid from 'uuid/v4'
import * as users from '../../users'

import createLogger from '../../logging'
import { AlexaRequest } from './types'
import { KodiInstances } from '../../tunnel-server'

const logger = createLogger('api/alexa/discovery-handler')

const LEGACY_CAPABILITIES = [
  {
    interface: 'Alexa.RemoteVideoPlayer',
    type: 'AlexaInterface',
    version: '3',
  },
  {
    interface: 'Alexa.PlaybackController',
    version: '3',
    type: 'AlexaInterface',
    supportedOperations: ['Play', 'Pause', 'Stop'],
  },
]

async function getDevices(
  event: Record<string, any>,
  username: string,
  kodiInstances: KodiInstances
) {
  const devices = (await users.getDevices(username)).map(d => _.pick(d, ['id', 'name']))
  logger.info('Devices', { username, devices })

  const connectedDevices = devices.filter(device => kodiInstances[device.id])

  const devicesWithCapabilities = await Promise.all(
    connectedDevices.map(async device => {
      try {
        const { capabilities } = await kodiInstances[device.id].rpc({ type: 'capabilities' })
        return { ...device, capabilities: capabilities || LEGACY_CAPABILITIES }
      } catch (error) {
        logger.error('Failed to get capabilities', { originalError: error, device })
        return { ...device, capabilities: LEGACY_CAPABILITIES }
      }
    })
  )

  return devicesWithCapabilities
}

export default async function discoveryHandler(
  { event, username }: AlexaRequest,
  kodiInstances: KodiInstances
) {
  const header = {
    messageId: uuid(),
    name: 'Discover.Response',
    namespace: 'Alexa.Discovery',
    payloadVersion: '3',
  }

  let payload = {}

  if (_.get(event, 'directive.header.name') === 'Discover') {
    const devices = await getDevices(event, username, kodiInstances)

    const endpoints = devices.map(device => ({
      capabilities: device.capabilities,
      endpointId: device.id,
      description: "Device description that's shown to the customer",
      displayCategories: ['OTHER'],
      friendlyName: device.name,
      manufacturerName: 'Kodi',
    }))

    payload = { endpoints }
  }

  return { header, payload }
}
