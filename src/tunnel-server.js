// @flow

import { Server as WsServer } from 'ws';

import createTunnel from './tunnel';
import { getDevice } from './users';

export default function createTunnelServer(server: Object, path: string): Object {
  const kodiInstances: Object = {};

  const wss = new WsServer({ server, clientTracking: true, path });

  wss.on('connection', (ws, req) => {
    console.log('kodi connected');

    ws.on('close', (code, reason) => {
      console.log('kodi disconnected', code, reason);
    });

    const authRegex = /Basic (.*)/;
    const match = req.headers.authorization.match(authRegex);
    if (!match) {
      console.log('Invalid Authorization header');
      ws.close();
      return;
    }
    const auth = Buffer.from(match[1], 'base64').toString();

    const [username, secret] = auth.split(':');

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
