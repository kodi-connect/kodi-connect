const { baseSetUp, asyncHandler, getAccessToken } = require('./util');

function getDiscoveryEvent(token) {
  return {
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
          token,
        },
      },
    },
  };
}

const expectedResponse = {
  event: {
    header: {
      messageId: expect.any(String),
      name: 'Discover.Response',
      namespace: 'Alexa.Discovery',
      payloadVersion: '3',
    },
    payload: {
      endpoints: [
        {
          capabilities: [
            {
              interface: 'Alexa.RemoteVideoPlayer',
              version: '3',
              type: 'AlexaInterface',
            },
            {
              interface: 'Alexa.PlaybackController',
              supportedOperations: [
                'Play',
                'Pause',
                'Stop',
                'StartOver',
                'Previous',
                'Next',
                'Rewind',
                'FastForward',
              ],
              version: '3',
              type: 'AlexaInterface',
            },
            {
              interface: 'Alexa.PlaybackStateReporter',
              version: '1.0',
              type: 'AlexaInterface',
              properties: {
                retrievable: true,
                supported: [
                  {
                    name: 'playbackState',
                  },
                ],
                proactivelyReported: true,
              },
            },
            {
              interface: 'Alexa.SeekController',
              version: '3',
              type: 'AlexaInterface',
            },
            {
              interface: 'Alexa.Speaker',
              version: '3',
              type: 'AlexaInterface',
              properties: {
                retrievable: true,
                supported: [
                  {
                    name: 'volume',
                  },
                  {
                    name: 'muted',
                  },
                ],
                proactivelyReported: false,
              },
            },
            {
              interface: 'Alexa.PowerController',
              version: '3',
              type: 'AlexaInterface',
              properties: {
                retrievable: true,
                supported: [
                  {
                    name: 'powerState',
                  },
                ],
                proactivelyReported: false,
              },
            },
          ],
          endpointId: 'd965a9d3-45a3-4044-88bc-3439fdf81757',
          description: "Device description that's shown to the customer",
          displayCategories: [
            'OTHER',
          ],
          friendlyName: 'Kodi',
          manufacturerName: 'Kodi',
        },
      ],
    },
  },
};

describe('Basic test', () => {
  beforeEach(async () => {
    await baseSetUp();
  });

  test('Discover device', async () => {
    const token = await getAccessToken();
    const event = getDiscoveryEvent(token);
    const response = await asyncHandler(event);
    expect(response).toEqual(expectedResponse);
  });
});
