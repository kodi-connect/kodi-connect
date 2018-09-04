// @flow

import { Server as WsServer } from 'ws';

import createTunnel from './tunnel';
import { getDevice } from './users';
import { parseAuthorizationHeader } from './util/api';
import createLogger from './logging';

const logger = createLogger('tunnel-server');

export default function createTunnelServer(server: Object, path: string): Object {
  const kodiInstances: Object = {};

  const wss = new WsServer({ server, clientTracking: true, path });

  wss.on('connection', (ws, req) => {
    logger.debug('kodi connected');

    ws.on('close', (code, reason) => {
      logger.debug('kodi disconnected', { code, reason });
    });

    ws.on('error', (error) => {
      logger.debug('Websocket error', { error });
    });

    const { username, secret } = parseAuthorizationHeader(req);
    logger.info('Kodi device connecting:', { username, secret });
    if (!username || !secret) {
      logger.warn('Invalid Authorization header');
      ws.close();
      return;
    }

    getDevice(username, secret).then((deviceId) => {
      logger.info('Device found', { deviceId });
      if (!deviceId) {
        ws.close();
        return;
      }

      if (kodiInstances[deviceId]) {
        logger.warn('Device already connected, closing socket', { deviceId });
        ws.close();
        return;
      }

      kodiInstances[deviceId] = {
        rpc: createTunnel(username, deviceId, ws),
        close: () => ws.close(),
      };

      ws.on('close', () => { delete kodiInstances[deviceId]; });
    }, (error) => {
      logger.error('Failed to get device', { error });
      ws.close();
    });
  });

  return kodiInstances;
}
