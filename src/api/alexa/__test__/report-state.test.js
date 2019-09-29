// @flow

import { handler } from '../index';
import * as tunnelServer from '../../../tunnel-server';

const event = {
  directive: {
    header: {
      namespace: 'Alexa',
      name: 'ReportState',
      payloadVersion: '3',
      messageId: '5b0c2ac3-ef1e-429d-b538-f01e97704c54',
      correlationToken: 'token',
    },
    endpoint: {
      scope: {
        type: 'BearerToken',
        token: '05572afe7db44a715bc4d8172dff92fbec2cc966',
      },
      endpointId: 'bffb974a-beca-4a1b-b5ef-e891efdd74f4',
      cookie: {},
    },
    payload: {},
  },
};

const expectedResponse = {
  context: {
    properties: [{
      name: 'volume',
      namespace: 'Alexa.Speaker',
      uncertaintyInMilliseconds: 0,
      value: 10,
    }],
  },
  event: {
    header: {
      namespace: 'Alexa',
      name: 'StateReport',
      correlationToken: event.directive.header.correlationToken,
      payloadVersion: '3',
    },
    endpoint: event.directive.endpoint,
    payload: {},
  },
};

describe('Report state', () => {
  test('should report state', async () => {
    jest
      .spyOn(tunnelServer, 'kodiRpcCommand')
      .mockImplementation(() => ({
        state: [{ name: 'volume', value: 10 }],
      }));

    // $FlowSuppress - this is just stupid ..
    const response = await handler({
      event,
      context: {},
      username: 'testuser',
      meta: {},
    }, {});

    if (!response.context) throw new Error('Expected response.context');

    expect(response).toEqual({
      ...expectedResponse,
      event: {
        ...expectedResponse.event,
        header: {
          ...expectedResponse.event.header,
          messageId: response.event.header.messageId,
        },
      },
      context: {
        properties: [{
          ...expectedResponse.context.properties[0],
          timeOfSample: response.context.properties[0].timeOfSample,
        }],
      },
    });
  });
});
