import { getRegionAndAccessToken } from './amazon'
import { transformState, createChangeReportEvent, sendAlexaEvent } from './util/alexa'

import createLogger from './logging'

const logger = createLogger('async-message-handler')

async function changeStateHandler(username: string, deviceId: string, data: Record<string, any>) {
  logger.debug('changeStateHandler', { data })

  const { changed, state, addon_change: addonChange } = data

  const changedState = state.find(s => s.name === changed)
  const restState = state.filter(s => s.name !== changed)

  if (!changedState) {
    logger.error('Invalid changed state', { data })
    throw new Error('Invalid changed state')
  }

  const changedProperty = transformState(changedState)
  const restProperties = restState.reduce((acc, s) => {
    const property = transformState(s)
    return property ? [...acc, property] : acc
  }, [])

  if (!changedProperty) {
    logger.error('Invalid changed state', { data })
    return
  }

  const { region, accessToken } = (await getRegionAndAccessToken(username)) || {}

  if (!accessToken || !region) {
    logger.warn("User doesn't have amazon region and/or access token", { username })
    return
  }

  const changeReportEvent = createChangeReportEvent(
    accessToken,
    deviceId,
    changedProperty,
    addonChange ? 'VOICE_INTERACTION' : 'PHYSICAL_INTERACTION',
    restProperties
  )

  await sendAlexaEvent(region, changeReportEvent)
}

export default async function asyncMessageHandler(
  username: string,
  deviceId: string,
  data: Record<string, any>
) {
  const { type, ...restData } = data

  let handler: (username: string, deviceId: string, data: Record<string, any>) => any

  switch (type) {
    case 'change_state':
      handler = changeStateHandler
      break
    default:
      throw new Error('Unknown async message type')
  }

  try {
    await handler(username, deviceId, restData)
  } catch (error) {
    logger.error('Async message handler failed', {
      originalError: error,
      username,
      deviceId,
      data,
    })
  }
}
