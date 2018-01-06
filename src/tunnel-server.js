// @flow

import { Server as WsServer } from 'ws';

import createTunnel from './tunnel';
import { getDevice } from './users';

export default function createTunnelServer(server: Object): Object {
  const kodiInstances: Object = {};

  const wss = new WsServer({ server, clientTracking: true, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('kodi connected');

    ws.once('message', (msgStr) => {
      try {
        const msg = JSON.parse(msgStr);
        if (!msg) throw new Error('Invalid message format, expected JSON');
        if (!msg.username || !msg.secret) throw new Error('Missing username and/or secret');

        getDevice(msg.username, msg.secret).then((deviceId) => {
          console.log('Device found:', deviceId);
          if (!deviceId) {
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
      } catch (error) {
        console.error('Kodi registration error:', error);
        ws.close();
      }
    });

    ws.on('close', (code, reason) => {
      console.log('kodi disconnected', code, reason);
    });
  });

  return kodiInstances;
}
