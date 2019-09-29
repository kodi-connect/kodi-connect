// @flow

import { handler } from '../index';

const event = {
  directive: {
    header: {
      namespace: 'Alexa.Authorization',
      name: 'AcceptGrant',
      payloadVersion: '3',
      messageId: '07727ea9-77b0-4185-8be7-8c357a124d65',
    },
    payload: {
      grant: {
        type: 'OAuth2.AuthorizationCode',
        code: 'RHZEbholRXCKFvUecEWU',
      },
      grantee: {
        type: 'BearerToken',
        token: '6f2dc0588323d6977a5c1afc23a687f6e571cbc3',
      },
    },
  } ,
};

describe('Authorization', () => {
  test('should authorize', async () => {
    const response = await handler({
      event,
      context: {},
      username: 'testuser',
      meta: { region: 'us' },
    });

    expect('AcceptGrant.Response').toEqual(response.event.header.name);
    expect('Alexa.Authorization').toEqual(response.event.header.namespace);
  });
});
