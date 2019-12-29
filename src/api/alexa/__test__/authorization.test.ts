import { handler } from '../index'

import * as amazon from '../../../amazon'
import * as users from '../../../users'

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
  },
}

const anotherEvent = {
  event: {
    directive: {
      header: {
        namespace: 'Alexa.Authorization',
        name: 'AcceptGrant',
        messageId: '9e62f970-c490-4817-b1fc-8cbe2842017f',
        payloadVersion: '3',
      },
      payload: {
        grant: { type: 'OAuth2.AuthorizationCode', code: '<secret>' },
        grantee: { type: 'BearerToken', token: '<secret>' },
      },
    },
  },
  context: {
    callbackWaitsForEmptyEventLoop: true,
    functionVersion: '$LATEST',
    functionName: 'kodi',
    memoryLimitInMB: '128',
    logGroupName: '/aws/lambda/kodi',
    logStreamName: '2019/12/28/[$LATEST]9873607de72c47918558e8f4c502b79a',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:<secret>:function:kodi',
    awsRequestId: 'f9f05db7-ad62-437f-9028-b444444f68b9',
  },
  meta: { region: 'us-east-1', version: '1.0' },
  username: '<secret>',
}

describe('Authorization', () => {
  test('should authorize', async () => {
    const getUserAuthTokensSpy = jest
      .spyOn(amazon, 'getUserAuthTokens')
      .mockImplementation(() => ({ token: 'abc' }))
    const storeAmazonTokensSpy = jest
      .spyOn(users, 'storeAmazonTokens')
      .mockImplementation(() => null)

    const response = await handler({
      event,
      context: {},
      username: 'testuser',
      meta: { region: 'us-east-1' },
    })

    expect(getUserAuthTokensSpy).toHaveBeenCalledWith('testuser', 'us', 'RHZEbholRXCKFvUecEWU')
    expect(storeAmazonTokensSpy).toHaveBeenCalledWith('testuser', { token: 'abc' })

    expect('AcceptGrant.Response').toEqual(response.event.header.name)
    expect('Alexa.Authorization').toEqual(response.event.header.namespace)
  })

  test('should also authorize', async () => {
    const getUserAuthTokensSpy = jest
      .spyOn(amazon, 'getUserAuthTokens')
      .mockImplementation(() => ({ token: 'abc' }))
    const storeAmazonTokensSpy = jest
      .spyOn(users, 'storeAmazonTokens')
      .mockImplementation(() => null)

    const response = await handler(anotherEvent)

    expect(getUserAuthTokensSpy).toHaveBeenCalledWith('testuser', 'us', 'RHZEbholRXCKFvUecEWU')
    expect(storeAmazonTokensSpy).toHaveBeenCalledWith('testuser', { token: 'abc' })

    expect(response.event.header.name).toEqual('AcceptGrant.Response')
    expect(response.event.header.namespace).toEqual('Alexa.Authorization')
  })
})
