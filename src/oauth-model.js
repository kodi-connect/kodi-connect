// @flow

/**
 * Module dependencies.
 */

import mongoose, { Schema } from 'mongoose';

import createLogger from './logging';

import config from './config';

export { getUser } from './users';

const logger = createLogger('oauth-model');

/**
 * Schema definitions.
 */

mongoose.model('OAuthAuthorizationCode', new Schema({
  code: { type: String },
  expiresAt: { type: Date },
  redirectUri: { type: String },
  scope: [{ type: String }],
  client: new Schema({
    id: { type: String },
  }),
  user: new Schema({
    username: { type: String },
  }),
}, { collection: 'OAuthAuthorizationCode' }));

mongoose.model('OAuthTokens', new Schema({
  accessToken: { type: String },
  accessTokenExpiresAt: { type: Date },
  client: { type: Object },
  clientId: { type: String },
  refreshToken: { type: String },
  refreshTokenExpiresAt: { type: Date },
  user: { type: Object },
  userId: { type: String },
}, { collection: 'OAuthTokens' }));

const OAuthTokensModel = mongoose.model('OAuthTokens');
const OAuthAuthorizationCodeModel = mongoose.model('OAuthAuthorizationCode');

/**
 * Get access token.
 */

export async function getAccessToken(bearerToken: string) {
  // Adding `.lean()`, as we get a mongoose wrapper object back from `findOne(...)`, and oauth2-server complains.
  logger.debug('getAccessToken', { bearerToken });
  const data = await OAuthTokensModel.findOne({ accessToken: bearerToken }).lean();
  logger.debug('getAccessToken', { data });

  return data;
}

/**
 * Get client.
 */

const customRedirectUris = (process.env.CUSTOM_REDIRECT_URI && [process.env.CUSTOM_REDIRECT_URI]) || [];
const customRedirectUrisRegex = customRedirectUris.map(uri => RegExp(uri));

export async function getClient(clientId: string, clientSecret: string) {
  // return OAuthClientsModel.findOne({ clientId: clientId, clientSecret: clientSecret }).lean();
  logger.debug('getClient', { clientId, clientSecret });

  let client = {
    id: 'abcdefghijklmnopqrstuvwxyz',
    grants: ['authorization_code', 'refresh_token'],
  };

  if (config.allowOauthPassword) {
    client = {
      ...client,
      grants: [...client.grants, 'password'],
    };
  }

  return client;
}

export async function validateRedirectUri(redirectUri: string) {
  const REDIRECT_URI_REGEX = [
    /https:\/\/layla\.amazon\.com\/api\/skill\/link\/.*/,
    /https:\/\/pitangui\.amazon\.com\/api\/skill\/link\/.*/,
    /https:\/\/alexa\.amazon\.co\.jp\/api\/skill\/link\/.*/,
    ...customRedirectUrisRegex,
  ];

  return REDIRECT_URI_REGEX.some(regex => regex.test(redirectUri));
}

/**
 * Get refresh token.
 */

export async function getRefreshToken(refreshToken: string) {
  return OAuthTokensModel.findOne({ refreshToken }).lean();
}

export async function saveAuthorizationCode(code: Object, client: Object, user: Object) {
  logger.debug('saveAuthorizationCode', { code, client, user });

  const authCode = new OAuthAuthorizationCodeModel({
    code: code.authorizationCode,
    expiresAt: code.expiresAt,
    redirectUri: code.redirectUri,
    scope: code.scope,
    client,
    user,
  });

  const data = await authCode.save();

  logger.debug('saveAuthorizationCode', { data });

  return {
    ...data,
    authorizationCode: data.code,
  };
}

export async function getAuthorizationCode(code: string) {
  logger.debug('getAuthorizationCode', { code });
  const data = await OAuthAuthorizationCodeModel.findOne({ code }).lean();
  logger.debug('getAuthorizationCode', { data });
  return data;
}

export async function revokeAuthorizationCode({ code }: { code: string }) {
  logger.debug('revokeAuthorizationCode', { code });
  await OAuthAuthorizationCodeModel.findOneAndRemove({ code }).lean();
  return true;
}

/**
 * Save token.
 */

export async function saveToken(token: Object, client: Object, user: Object) {
  logger.debug('saveToken', { token, client, user });
  const accessToken = new OAuthTokensModel({
    ...token,
    client,
    user,
  });

  const data = await accessToken.save();

  logger.debug('saveToken', { data });

  return data;
}

export async function revokeToken({ refreshToken }: { refreshToken: string }) {
  await OAuthTokensModel.findOneAndRemove({ refreshToken });

  return true;
}
