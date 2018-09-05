// @flow

import axios from 'axios';

import { getAmazonTokens, storeAmazonTokens } from './users';

import config from './config';
import createLogger from './logging';

import { validateAccessTokenResponse } from './type-validation';
import { stringifyError } from './util/alexa';
import type { AwsRegion, AccessTokenRequest, AmazonTokens } from './types';

const logger = createLogger('amazon');

async function accessTokenRequest(region: AwsRegion, request: AccessTokenRequest): Promise<AmazonTokens> {
  const currentTime = Date.now();

  logger.debug('Requesting access tokens', { region, request });

  let response;
  try {
    response = await axios({
      method: 'POST',
      url: config.amazonAuthUrl,
      data: {
        ...request,
        client_id: config.amazonClientId,
        client_secret: config.amazonClientSecret,
      },
    });
  } catch (error) {
    logger.error(
      'Failed to get amazon tokens',
      {
        error,
        data: error.response && error.response.data,
        region,
        request,
      },
    );
    throw new Error(stringifyError(error) || error.message);
  }

  const accessTokenResponse = validateAccessTokenResponse(response.data);

  const { expires_in: expiresIn, ...rest } = accessTokenResponse;
  return { ...rest, expires_at: currentTime + (expiresIn * 1000), region };
}

export async function getUserAuthTokens(region: AwsRegion, code: string): Promise<AmazonTokens> {
  return accessTokenRequest(region, { grant_type: 'authorization_code', code });
}

export async function refreshAccessToken(region: AwsRegion, refreshToken: string): Promise<AmazonTokens> {
  return accessTokenRequest(region, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

export async function getRegionAndAccessToken(username: string): Promise<?{ region: AwsRegion, accessToken: string }> {
  const currentTime = Date.now();

  let amazonTokens = await getAmazonTokens(username);

  if (!amazonTokens) return null;

  if (currentTime >= amazonTokens.expires_at + (10 * 1000)) {
    amazonTokens = await refreshAccessToken(amazonTokens.region, amazonTokens.refresh_token);
    await storeAmazonTokens(username, amazonTokens);
  }

  return { region: amazonTokens.region, accessToken: amazonTokens.access_token };
}
