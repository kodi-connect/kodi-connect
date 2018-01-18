// @flow

import { Server as WsServer } from 'ws';

import createTunnel from './tunnel';
import { getDevice } from './users';
import { parseAuthorizationHeader } from './utils';

export default function createTunnelServer(server: Object, path: string): Object {
  const kodiInstances: Object = {};

  const wss = new WsServer({ server, clientTracking: true, path });

  wss.on('connection', (ws, req) => {
    console.log('kodi connected');

    ws.on('close', (code, reason) => {
      console.log('kodi disconnected', code, reason);
    });

    const { username, secret } = parseAuthorizationHeader(req);
    console.log('Kodi device connecting:', username, secret);
    if (!username || !secret) {
      console.log('Invalid Authorization header');
      ws.close();
      return;
    }

    getDevice(username, secret).then((deviceId) => {
      console.log('Device found:', deviceId);
      if (!deviceId) {
        ws.close();
        return;
      }

      if (kodiInstances[deviceId]) {
        console.log(`Device ${deviceId} already connected, closing socket`);
        ws.close();
        return;
      }

      kodiInstances[deviceId] = {
        rpc: createTunnel(ws),
        close: () => ws.close(),
      };

      ws.on('close', () => { delete kodiInstances[deviceId]; });
    }, (error) => {
      console.warn('Failed to get device:', error);
      ws.close();
    });
  });

  return kodiInstances;
}
