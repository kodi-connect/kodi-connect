// @flow

import { handler } from '../index';
import { connectMongoose, closeMongoose } from './utils';

const event = {
  directive: {
    header: {
      messageId: '12efe1cb-7a9c-4baf-9776-074d9166b5b8',
      name: 'Discover',
      namespace: 'Alexa.Discovery',
      payloadVersion: '3',
    },
    payload: {
      scope: {
        type: 'BearerToken',
        token: 'd033e0d07276586afd82114a58814ada2c886e7e',
      },
    },
  },
};

describe('Discovery', () => {
  beforeAll(async () => {
    await connectMongoose();
  });

  afterAll(async () => {
    await closeMongoose();
  });

  test('should discover devices', async () => {
    const response = await handler({
      event,
      context: {},
      username: 'testuser',
      meta: {},
    }, {});
    const { endpoints } = response.event.payload;
    expect(endpoints).toHaveLength(0);
  });
});
