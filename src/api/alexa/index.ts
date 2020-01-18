import _ from 'lodash'
import uuid from 'uuid/v4'

import { Router } from 'express'

import defaultHandler from './default-handler'
import discoveryHandler from './discovery-handler'
import remoteVideoPlayerHandler from './remote-video-player-handler'
import playbackHandler from './playback-handler'
import powerControllerHandler from './power-controller-handler'
import speakerHandler from './speaker-handler'
import seekControllerHandler from './seek-controller-handler'
import authorizationHandler from './authorization-handler'
import { jsonSchemaValidation } from './validation'
import { DeviceUnreachableError, DeviceNotOwner, DeviceUnknownCommand } from '../../tunnel-server'
import createLogger from '../../logging'
import { wrapAsync } from '../../util/api'
import { AmazonAlexaRequest, AlexaRequest } from './types'
import { KodiInstances } from '../../tunnel-server'

const logger = createLogger('api/alexa')

function getHandler(
  namespace
): (
  arg0: AlexaRequest,
  arg1: KodiInstances
) => Promise<{
  header: Record<string, any>
  payload: Record<string, any>
  context?: Record<string, any>
}> {
  switch (namespace) {
    case 'Alexa':
      return defaultHandler
    case 'Alexa.Discovery':
      return discoveryHandler
    case 'Alexa.RemoteVideoPlayer':
      return remoteVideoPlayerHandler
    case 'Alexa.PlaybackController':
      return playbackHandler
    case 'Alexa.PowerController':
      return powerControllerHandler
    case 'Alexa.Speaker':
      return speakerHandler
    case 'Alexa.SeekController':
      return seekControllerHandler
    case 'Alexa.Authorization':
      return authorizationHandler
    default:
      logger.warn('Unknown namespace:', namespace)
      throw new Error(`Unknown namespace: ${namespace}`)
  }
}

function getErrorResponsePayload(error: Error) {
  if (error instanceof DeviceUnreachableError) {
    return {
      type: 'ENDPOINT_UNREACHABLE',
      message: 'Unable to reach Kodi because it appears to be offline',
    }
  }
  if (error instanceof DeviceNotOwner) {
    return {
      type: 'NO_SUCH_ENDPOINT',
      message: 'No such Kodi device connected',
    }
  }
  if (error instanceof DeviceUnknownCommand) {
    return {
      type: 'FIRMWARE_OUT_OF_DATE',
      message: 'User should update Addon',
    }
  }
  return {
    type: 'INTERNAL_ERROR',
    message: 'Unexpected response from Kodi',
  }
}

function getErrorResposne(error: Error, correlationToken: string) {
  return {
    header: {
      messageId: uuid(),
      correlationToken,
      namespace: 'Alexa',
      name: 'ErrorResponse',
      payloadVersion: '3',
    },
    payload: getErrorResponsePayload(error),
  }
}

function getOauthToken(req: Record<string, any>) {
  const { alexaRequest }: { alexaRequest: AmazonAlexaRequest } = req.body
  const namespace = _.get(alexaRequest, 'event.directive.header.namespace')

  switch (namespace) {
    case 'Alexa.Authorization':
      return _.get(alexaRequest, 'event.directive.payload.grantee.token')
    case 'Alexa.Discovery':
      return _.get(alexaRequest, 'event.directive.payload.scope.token')
    default:
      return _.get(alexaRequest, 'event.directive.endpoint.scope.token')
  }
}

function setOauthToken(req: Record<string, any>, res: Record<string, any>, next: Function) {
  logger.debug('Extracting oath token from', { req: req.body })
  const accessToken = getOauthToken(req)
  logger.debug('Extracted oath token', { accessToken })

  if (accessToken) req.headers.Authorization = `Bearer ${accessToken}`

  next()
}

export async function handler(
  request: AlexaRequest,
  kodiInstances: KodiInstances
): Promise<{
  context?: Record<string, any>
  event: { header: Record<string, any>; payload: Record<string, any> }
}> {
  logger.debug('Request:')
  logger.debug(JSON.stringify(request, null, '  '))

  const namespace = _.get(request, 'event.directive.header.namespace')

  const namespaceHandler = getHandler(namespace)

  let response
  try {
    const { context: responseContext, ...responseEvent } = await namespaceHandler(
      request,
      kodiInstances
    )

    response = responseContext
      ? { context: responseContext, event: responseEvent }
      : { event: responseEvent }
  } catch (error) {
    logger.error('Alexa handler failed', { originalError: error, request })
    response = {
      event: getErrorResposne(error, _.get(request.event, 'directive.header.correlationToken')),
    }
  }

  if (process.env.NODE_ENV !== 'production') jsonSchemaValidation(response)

  return response
}

export default function createAlexaRouter(
  oauth: Record<string, any>,
  kodiInstances: KodiInstances
) {
  const router = new Router({ mergeParams: true })

  router.use(setOauthToken)

  router.post(
    '/',
    oauth.authenticate(),
    wrapAsync(async (req, res) => {
      const username = _.get(res, 'locals.oauth.token.user.username')
      const {
        alexaRequest,
        meta,
      }: { alexaRequest: AmazonAlexaRequest; meta: Record<string, any> } = req.body

      const alexaHandlerRequest: AlexaRequest = {
        ...alexaRequest,
        meta,
        username,
      }

      const response = await handler(alexaHandlerRequest, kodiInstances)

      return res.json(response)
    })
  )

  return router
}
