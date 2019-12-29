// eslint-disable-next-line max-classes-per-file
import { Server as WsServer } from 'ws'

import createTunnel, { RpcTimeoutError } from './tunnel'
import { getDevice, isUsersDevice } from './users'
import { parseAuthorizationHeader } from './util/api'
import createLogger from './logging'

const logger = createLogger('tunnel-server')

export type KodiInstances = Record<string, any>

export default function createTunnelServer(
  server: Record<string, any>,
  path: string
): KodiInstances {
  const kodiInstances: KodiInstances = {}

  const wss = new WsServer({ server, clientTracking: true, path })

  wss.on('connection', (ws, req) => {
    logger.debug('kodi connected')

    ws.on('close', (code, reason) => {
      logger.debug('kodi disconnected', { code, reason })
    })

    ws.on('error', error => {
      logger.debug('Websocket error', { error })
    })

    const { username, secret } = parseAuthorizationHeader(req)
    const { addonversion } = req.headers || {}
    logger.info('Kodi device connecting:', { username, secret, addonversion })
    if (!username || !secret) {
      logger.warn('Invalid Authorization header', { username, secret })
      ws.close()
      return
    }

    getDevice(username, secret).then(
      deviceId => {
        logger.info('Device found', { username, deviceId })
        if (!deviceId) {
          ws.close()
          return
        }

        if (kodiInstances[deviceId]) {
          logger.warn('Device already connected, closing socket', { username, deviceId })
          ws.close()
          return
        }

        kodiInstances[deviceId] = {
          rpc: createTunnel(username, deviceId, ws),
          close: () => ws.close(),
        }

        ws.on('close', () => {
          delete kodiInstances[deviceId]
        })
      },
      error => {
        logger.error('Failed to get device', { username, error })
        ws.close()
      }
    )
  })

  return kodiInstances
}

export class DeviceUnreachableError extends Error {
  constructor() {
    super('Device not connected')
  }
}
export class DeviceNotOwner extends Error {
  constructor() {
    super('User is not owner of the device')
  }
}

export class DeviceUnknownCommand extends Error {
  constructor() {
    super("Device can't handle requested command")
  }
}

export async function kodiRpc(
  kodiInstances: KodiInstances,
  username: string,
  deviceId: string,
  rpc: Record<string, any>
): Promise<Record<string, any>> {
  if (!kodiInstances[deviceId]) {
    throw new DeviceUnreachableError()
  }

  const validDevice = await isUsersDevice(username, deviceId)
  if (!validDevice) {
    throw new DeviceNotOwner()
  }

  logger.info('Sending message to kodi', { deviceId, rpc })

  try {
    const rpcRes = await kodiInstances[deviceId].rpc(rpc)
    logger.info('Response message from kodi', { deviceId, rpcRes })

    if (rpcRes.status === 'error') {
      switch (rpcRes.error) {
        case 'unknown_command':
          throw new DeviceUnknownCommand()
        default:
          throw new Error(`Unknown error received: ${rpcRes.error}`)
      }
    }

    return rpcRes
  } catch (error) {
    if (error instanceof RpcTimeoutError) {
      logger.warn('RPC Timeout', { deviceId, rpc })
      throw new Error('Timeout')
    } else {
      logger.error('RPC call failed', { error })
      throw new Error('RPC failed')
    }
  }
}

export type CommandType =
  | 'state'
  | 'turnOn'
  | 'turnOff'
  | 'next'
  | 'previous'
  | 'startOver'
  | 'play'
  | 'pause'
  | 'stop'
  | 'rewind'
  | 'fastForward'
  | 'setVolume'
  | 'adjustVolume'
  | 'setMute'
  | 'searchAndPlay'
  | 'searchAndDisplay'
  | 'seek'

export async function kodiRpcCommand(
  kodiInstances: KodiInstances,
  username: string,
  deviceId: string,
  commandType: CommandType,
  additionalData?: Record<string, any>
): Promise<Record<string, any>> {
  return await kodiRpc(kodiInstances, username, deviceId, {
    type: 'command',
    commandType,
    ...additionalData,
  })
}

export function asyncKodiRpcCommand(
  kodiInstances: KodiInstances,
  username: string,
  deviceId: string,
  commandType: CommandType,
  additionalData?: Record<string, any>
) {
  kodiRpcCommand(kodiInstances, username, deviceId, commandType, additionalData).catch(error =>
    logger.error('Kodi RPC Command failed', {
      error,
      username,
      deviceId,
      commandType,
      additionalData,
    })
  )
}
