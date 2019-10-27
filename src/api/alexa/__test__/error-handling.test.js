// @flow

import { handler } from '../index';
import * as tunnelServer from '../../../tunnel-server';
import { readEvent } from './utils';

describe('Error handling', () => {
  test('Unreachable Kodi', async () => {
    const event = readEvent('play-comedy-mean-girls.json');

    jest
      .spyOn(tunnelServer, 'asyncKodiRpcCommand')
      .mockImplementation(() => {
        throw new tunnelServer.DeviceUnreachableError();
      });

    const response = await handler({
      event,
      context: {},
      username: 'testuser',
      meta: {},
    }, {});

    expect(response.event.payload.type).toEqual('ENDPOINT_UNREACHABLE');
  });

  test('Unknown command', async () => {
    const event = readEvent('play-comedy-mean-girls.json');

    jest
      .spyOn(tunnelServer, 'asyncKodiRpcCommand')
      .mockImplementation(() => {
        throw new tunnelServer.DeviceUnknownCommand();
      });

    const response = await handler({
      event,
      context: {},
      username: 'testuser',
      meta: {},
    }, {});

    expect(response.event.payload.type).toEqual('FIRMWARE_OUT_OF_DATE');
  });
});
