/* eslint-disable max-len */

const {
  baseSetUp, asyncHandler, getAccessToken, getKodiLog,
} = require('./util');

function getEvent(token) {
  return {
    directive: {
      payload: {
        entities: [
          {
            type: 'Franchise',
            uri: 'entity://avers/franchise/Thor',
            value: 'Thor',
            externalIds: {
              ENTITY_ID: '0',
            },
          },
          {
            type: 'MediaType',
            value: 'Movie',
          },
        ],
      },
      header: {
        payloadVersion: '3',
        messageId: 'b98e0ee5-0f69-44f7-acae-6fc58555bd51',
        namespace: 'Alexa.RemoteVideoPlayer',
        name: 'SearchAndDisplayResults',
        correlationToken: 'eca341aa-39ad-4c2a-8574-86ef84638cbd',
      },
      endpoint: {
        cookie: {},
        scope: {
          token,
          type: 'BearerToken',
        },
        endpointId: 'd965a9d3-45a3-4044-88bc-3439fdf81757',
      },
    },
  };
}

const expectedResponse = {
  event: {
    header: {
      messageId: expect.any(String),
      name: 'Response',
      namespace: 'Alexa',
      payloadVersion: '3',
      correlationToken: 'eca341aa-39ad-4c2a-8574-86ef84638cbd',
    },
    endpoint: {
      endpointId: 'd965a9d3-45a3-4044-88bc-3439fdf81757',
    },
    payload: {},
  },
};

describe('Search and Play', () => {
  beforeEach(async () => {
    await baseSetUp();
  });

  test('Play Thor movie', async () => {
    const token = await getAccessToken();
    const event = getEvent(token);
    const response = await asyncHandler(event);
    expect(response).toEqual(expectedResponse);


    await (new Promise((resolve) => {
      setTimeout(resolve, 2000);
    }));

    const kodilog = getKodiLog();

    const expectedKodiLog = `\
[JSONRPC_OUT] {"params": {"params": {"entities": "m13xm13"}, "addonid": "plugin.video.kodiconnect"}, "jsonrpc": "2.0", "method": "Addons.ExecuteAddon", "id": 0}
[JSONRPC_IN] {"result": "OK"}
`;
    expect(kodilog).toEqual(expectedKodiLog);
  });
});
