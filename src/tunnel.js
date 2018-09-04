// @flow

import uuid from 'uuid/v4';

import createLogger from './logging';
import asyncMessageHandler from './async-message-handler';

const logger = createLogger('tunnel');

export default function createTunnel(username: string, deviceId: string, ws: any) {
  const rpcMsgs = {};

  const rpcFunc = (data: Object) => {
    const correlationId = uuid();

    let cb;

    const p: Promise<Object> = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('RPC Timeout')), 60 * 1000);

      cb = (responseMessage: Object) => {
        clearTimeout(timeoutId);
        delete rpcMsgs[correlationId];
        resolve(responseMessage);
      };
    });

    rpcMsgs[correlationId] = cb;

    ws.send(JSON.stringify({ correlationId, data }));

    return p;
  };

  ws.on('message', (msgStr: string) => {
    const msg = JSON.parse(msgStr) || {};

    if (msg.ping === 'pong') return;

    if (msg.async === true) {
      asyncMessageHandler(username, deviceId, msg.data).catch((error) => {
        logger.error('Async message handler failed', { error });
        ws.close();
      });
      return;
    }

    if (!msg.correlationId || !rpcMsgs[msg.correlationId]) {
      logger.warn('Correlation id not found', { correlationId: msg.correlationId });
      ws.close();
      return;
    }

    if (!msg.data) {
      logger.warn('No data message', { msg });
      ws.close();
      return;
    }

    logger.info('Received command', { msg });

    rpcMsgs[msg.correlationId](msg.data);
  });

  return rpcFunc;
}
