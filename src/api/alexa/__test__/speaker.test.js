// @flow

import { handler } from '../index';
import * as tunnelServer from '../../../tunnel-server';

const SET_VOLUME_EVENT = {
  directive: {
    header: {
      namespace: 'Alexa.Speaker',
      name: 'SetVolume',
      messageId: '5f8a426e-01e4-4cc9-8b79-65f8bd0fd8a4',
      correlationToken: 'dFMb0z+PgpgdDmluhJ1LddFvSqZ/jCc8ptlAKulUj90jSqg==',
      payloadVersion: '3',
    },
    endpoint: {
      scope: {
        type: 'BearerToken',
        token: 'access-token-from-skill',
      },
      endpointId: 'device-001',
      cookie: {},
    },
    payload: {
      volume: 50,
    },
  },
};

const ADJUST_VOLUME_EVENT = {
  directive: {
    header: {
      namespace: 'Alexa.Speaker',
      name: 'AdjustVolume',
      messageId: 'c8d53423-b49b-48ee-9181-f50acedf2870',
      correlationToken: 'dFMb0z+PgpgdDmluhJ1LddFvSqZ/jCc8ptlAKulUj90jSqg==',
      payloadVersion: '3',
    },
    endpoint: {
      scope: {
        type: 'BearerToken',
        token: 'access-token-from-skill',
      },
      endpointId: 'device-001',
      cookie: {},
    },
    payload: {
      volume: -20,
      volumeDefault: false,
    },
  },
};

const SET_MUTE_EVENT = {
  directive: {
    header: {
      namespace: 'Alexa.Speaker',
      name: 'SetMute',
      messageId: 'c8d53423-b49b-48ee-9181-f50acedf2870',
      correlationToken: 'dFMb0z+PgpgdDmluhJ1LddFvSqZ/jCc8ptlAKulUj90jSqg==',
      payloadVersion: '3',
    },
    endpoint: {
      scope: {
        type: 'BearerToken',
        token: 'access-token-from-skill',
      },
      endpointId: 'device-001',
      cookie: {},
    },
    payload: {
      mute: true,
    },
  },
};

describe('Speaker', () => {
  test('set volume', async () => {
    const kodiRpcCommandSpy = jest
      .spyOn(tunnelServer, 'kodiRpcCommand')
      .mockImplementation(() => ({
        state: [{ name: 'volume', value: 10 }],
      }));

    await handler({
      event: SET_VOLUME_EVENT,
      context: {},
      username: 'testuser',
      meta: {},
    }, {});

    expect(kodiRpcCommandSpy).toHaveBeenCalledWith({}, 'testuser', 'device-001', 'setVolume', { volume: 50 });
  });

  test('adjust volume', async () => {
    const kodiRpcCommandSpy = jest
      .spyOn(tunnelServer, 'kodiRpcCommand')
      .mockImplementation(() => ({
        state: [{ name: 'volume', value: 10 }],
      }));

    await handler({
      event: ADJUST_VOLUME_EVENT,
      context: {},
      username: 'testuser',
      meta: {},
    }, {});

    expect(kodiRpcCommandSpy).toHaveBeenCalledWith({}, 'testuser', 'device-001', 'adjustVolume', { volume: -20 });
  });

  test('set mute', async () => {
    const kodiRpcCommandSpy = jest
      .spyOn(tunnelServer, 'kodiRpcCommand')
      .mockImplementation(() => ({
        state: [{ name: 'volume', value: 10 }],
      }));

    await handler({
      event: SET_MUTE_EVENT,
      context: {},
      username: 'testuser',
      meta: {},
    }, {});

    expect(kodiRpcCommandSpy).toHaveBeenCalledWith({}, 'testuser', 'device-001', 'setMute', { mute: true });
  });
});
