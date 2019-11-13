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
        name: 'SearchAndPlay',
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
      setTimeout(resolve, 1000);
    }));

    const kodilog = getKodiLog();

    const expectedKodiLog = `\
[JSONRPC_OUT] {"params": {"item": {"movieid": 13}, "options": {"resume": true}}, "jsonrpc": "2.0", "method": "Player.Open", "id": 1}
[JSONRPC_OUT] {"jsonrpc": "2.0", "method": "Player.GetActivePlayers", "id": 1}
[JSONRPC_IN] {"result": [{"playerid": 1, "type": "video"}]}
[JSONRPC_OUT] {"params": {"playerid": 1, "properties": ["title", "season", "episode", "duration", "tvshowid", "set"]}, "jsonrpc": "2.0", "method": "Player.GetItem", "id": "VideoGetItem"}
[JSONRPC_IN] {"jsonrpc": "2.0", "id": "VideoGetItem", "result": {"item": {"type": "movie", "id": 13}}}
[JSONRPC_IN] {}
[JSONRPC_OUT] {"params": {"properties": ["volume"]}, "jsonrpc": "2.0", "method": "Application.GetProperties", "id": 1}
[JSONRPC_IN] {"result": {"volume": 100, "muted": false}}
[JSONRPC_OUT] {"params": {"properties": ["muted"]}, "jsonrpc": "2.0", "method": "Application.GetProperties", "id": 1}
[JSONRPC_IN] {"result": {"volume": 100, "muted": false}}
[JSONRPC_OUT] {"jsonrpc": "2.0", "method": "Player.GetActivePlayers", "id": 1}
[JSONRPC_IN] {"result": [{"playerid": 1, "type": "video"}]}
[JSONRPC_OUT] {"params": {"playerid": 1, "properties": ["speed"]}, "jsonrpc": "2.0", "method": "Player.GetProperties", "id": 1}
[JSONRPC_IN] {"result": {"speed": 1}}
`;
    expect(kodilog).toEqual(expectedKodiLog);
  });
});
