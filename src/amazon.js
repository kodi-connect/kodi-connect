// @flow

import axios from 'axios';

import { getAlexaSkillMessagingCredentials, getAmazonTokens, storeAmazonTokens } from './users';

import config from './config';
import createLogger from './logging';

import { validateAccessTokenResponse } from './type-validation';
import type { AwsRegion, AccessTokenRequest, AmazonTokens } from './types';

const logger = createLogger('amazon');

async function accessTokenRequest(alexaSkillMessagingCredentials, region: AwsRegion, request: AccessTokenRequest): Promise<AmazonTokens> {
  const currentTime = Date.now();

  logger.debug('Requesting access tokens', { region, request });

  const response = await axios({
    method: 'POST',
    url: config.amazonAuthUrl,
    data: {
      ...request,
      client_id: alexaSkillMessagingCredentials.clientId,
      client_secret: alexaSkillMessagingCredentials.clientSecret,
    },
  });

  const accessTokenResponse = validateAccessTokenResponse(response.data);

  const { expires_in: expiresIn, ...rest } = accessTokenResponse;
  return { ...rest, expires_at: currentTime + (expiresIn * 1000), region };
}

export async function getUserAuthTokens(username: string, region: AwsRegion, code: string): Promise<AmazonTokens> {
  const alexaSkillMessagingCredentials = await getAlexaSkillMessagingCredentials(username);
  return accessTokenRequest(alexaSkillMessagingCredentials, region, { grant_type: 'authorization_code', code });
}

export async function refreshAccessToken(username: string, region: AwsRegion, refreshToken: string): Promise<AmazonTokens> {
  const alexaSkillMessagingCredentials = await getAlexaSkillMessagingCredentials(username);
  return accessTokenRequest(
    alexaSkillMessagingCredentials,
    region,
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
  );
}

export async function getRegionAndAccessToken(username: string): Promise<?{ region: AwsRegion, accessToken: string }> {
  const currentTime = Date.now();

  let amazonTokens = await getAmazonTokens(username);

  if (!amazonTokens) return null;

  if (currentTime >= amazonTokens.expires_at + (10 * 1000)) {
    amazonTokens = await refreshAccessToken(username, amazonTokens.region, amazonTokens.refresh_token);
    await storeAmazonTokens(username, amazonTokens);
  }

  return { region: amazonTokens.region, accessToken: amazonTokens.access_token };
}
