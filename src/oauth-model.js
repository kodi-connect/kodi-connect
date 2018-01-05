// @flow

/**
 * Module dependencies.
 */

import mongoose, { Schema } from 'mongoose';

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
}));

mongoose.model('OAuthTokens', new Schema({
  accessToken: { type: String },
  accessTokenExpiresAt: { type: Date },
  client: { type: Object },
  clientId: { type: String },
  refreshToken: { type: String },
  refreshTokenExpiresAt: { type: Date },
  user: { type: Object },
  userId: { type: String },
}));

const OAuthTokensModel = mongoose.model('OAuthTokens');
const OAuthAuthorizationCodeModel = mongoose.model('OAuthAuthorizationCode');

/**
 * Get access token.
 */

export async function getAccessToken(bearerToken: string) {
  // Adding `.lean()`, as we get a mongoose wrapper object back from `findOne(...)`, and oauth2-server complains.
  console.log('getAccessToken', bearerToken);
  const data = await OAuthTokensModel.findOne({ accessToken: bearerToken }).lean();
  console.log('getAccessToken', data);

  return data;
}

/**
 * Get client.
 */

const customRedirectUris = (process.env.CUSTOM_REDIRECT_URI && [process.env.CUSTOM_REDIRECT_URI]) || [];

export async function getClient(clientId: string, clientSecret: string) {
  // return OAuthClientsModel.findOne({ clientId: clientId, clientSecret: clientSecret }).lean();
  console.log('getClient:', clientId, clientSecret);
  return {
    id: 'abcdefghijklmnopqrstuvwxyz',
    grants: ['authorization_code', 'refresh_token'],
    redirectUris: [
      'https://layla.amazon.com/api/skill/link/M26THQ9LJL7SS3',
      'https://pitangui.amazon.com/api/skill/link/M26THQ9LJL7SS3',
      'https://alexa.amazon.co.jp/api/skill/link/M26THQ9LJL7SS3',
      ...customRedirectUris,
    ],
  };
}

/**
 * Get refresh token.
 */

export async function getRefreshToken(refreshToken: string) {
  return OAuthTokensModel.findOne({ refreshToken }).lean();
}

export async function saveAuthorizationCode(code: Object, client: Object, user: Object) {
  console.log('saveAuthorizationCode', code, client, user);

  const authCode = new OAuthAuthorizationCodeModel({
    code: code.authorizationCode,
    expiresAt: code.expiresAt,
    redirectUri: code.redirectUri,
    scope: code.scope,
    client,
    user,
  });

  const data = await authCode.save();

  console.log('saveAuthorizationCode', data);

  return {
    ...data,
    authorizationCode: data.code,
  };
}

export async function getAuthorizationCode(code: string) {
  console.log('getAuthorizationCode', code);
  const data = await OAuthAuthorizationCodeModel.findOne({ code }).lean();
  console.log('getAuthorizationCode', data);
  return data;
}

export async function revokeAuthorizationCode({ code }: { code: string}) {
  console.log('revokeAuthorizationCode', code);
  await OAuthAuthorizationCodeModel.findOneAndRemove({ code }).lean();
  return true;
}

/**
 * Save token.
 */

export async function saveToken(token: Object, client: Object, user: Object) {
  console.log('saveToken', token, client, user);
  const accessToken = new OAuthTokensModel({
    ...token,
    client,
    user,
  });

  const data = await accessToken.save();

  console.log('saveToken', data);

  return data;
}

export async function revokeToken({ refreshToken }: { refreshToken: string }) {
  await OAuthTokensModel.findOneAndRemove({ refreshToken });

  return true;
}
