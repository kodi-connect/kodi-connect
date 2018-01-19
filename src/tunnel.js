// @flow

import uuid from 'uuid/v4';

import createLogger from './logging';

const logger = createLogger('tunnel');

export default function createTunnel(ws: any) {
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

  ws.on('message', (msgStr) => {
    const msg = JSON.parse(msgStr);

    if (msg.ping === 'pong') return;

    logger.info('Received command', { msg });

    if (!msg || !msg.correlationId || !msg.data) {
      logger.warn('Invalid message', { msg });
      ws.close();
      return;
    }
    if (!rpcMsgs[msg.correlationId]) {
      logger.warn('Correlation id not found', { correlationId: msg.correlationId });
      ws.close();
      return;
    }
    rpcMsgs[msg.correlationId](msg.data);
  });

  return rpcFunc;
}
