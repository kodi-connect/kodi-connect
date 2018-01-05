// @flow

import uuid from 'uuid/v4';

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

    console.log('Received command:', msg);

    if (!msg || !msg.correlationId || !msg.data) {
      console.log('Invalid message');
      ws.close();
      return;
    }
    if (!rpcMsgs[msg.correlationId]) {
      console.log('Correlation id not found');
      ws.close();
      return;
    }
    rpcMsgs[msg.correlationId](msg.data);
  });

  return rpcFunc;
}
