// @flow

import axios from 'axios';
import { AmazonCredentials } from '../params';
import createLogger from '../logging';
import { sleep } from '../util/time';

const MAX_ATTEMPTS = 5;
const MIN_ACCESS_TOKEN_LIFETIME = 5 * 1000; // 5 seconds

const logger = createLogger('ask/api');

class AccessTokenNotFound extends Error {
  constructor() {
    super('Amazon AccessToken not found');
  }
}

function accessTokenValid(expires_at: number): boolean {
  return Date.now() + MIN_ACCESS_TOKEN_LIFETIME < expires_at;
}

export function transformAccessTokenData(accessTokenData: Object): Object {
  const { access_token, refresh_token, expires_in } = accessTokenData;

  return {
    access_token,
    refresh_token,
    expires_at: Date.now() + (expires_in * 1000),
  };
}

export async function accessTokenRequest(authorizationCode: string) {
  const response = await axios({
    method: 'POST',
    url: 'https://api.amazon.com/auth/o2/token ',
    data: {
      client_id: 'amzn1.application-oa2-client.2f7fd62ac6b1463b85d862a28526f78b',
      client_secret: '33ea99b07022fce526dfad2036474fd795a7446f6230871e2616019647f508ab',
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: 'https://mactunnel.kislan.sk/lwa/redirect_uri',
    },
  });

  return response.data;
}

async function refreshTokenRequest(refreshToken: string) {
  logger.info('Refreshing access token');

  const response = await axios({
    method: 'POST',
    url: 'https://api.amazon.com/auth/o2/token ',
    data: {
      client_id: 'amzn1.application-oa2-client.2f7fd62ac6b1463b85d862a28526f78b',
      client_secret: '33ea99b07022fce526dfad2036474fd795a7446f6230871e2616019647f508ab',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
  });

  return response.data;
}

async function getAccessToken() {
  let accessTokens = await AmazonCredentials.getValue(undefined);

  if (!accessTokens) throw new AccessTokenNotFound();

  if (!accessTokenValid(accessTokens.expires_at)) {
    const accessTokensData = await refreshTokenRequest(accessTokens.refresh_token);
    accessTokens = transformAccessTokenData(accessTokensData);

    await AmazonCredentials.setValue(accessTokens);
  }

  return accessTokens.access_token;
}

export async function askRequest(options: Object): $Call<axios> {
  const { path, headers, ...restOptions } = options;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const accessToken = await getAccessToken();

      return await axios({
        ...restOptions,
        url: `https://api.amazonalexa.com${path}`,
        headers: {
          ...headers,
          Authorization: accessToken,
        },
      });
    } catch (error) {
      logger.error(
        'Ask request failed',
        {
          error,
          responseData: error.response && error.response.data,
          path,
          ...restOptions,
        },
      );
      if (error.response && error.response.status !== 429 && attempt < MAX_ATTEMPTS) {
        await sleep(1000);
        continue;
      }
      throw error;
    }
  }
}
