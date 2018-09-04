// @flow

export type AwsRegion = 'us' | 'eu' | 'fe';

type AmazonTokensBase = {
  access_token: string,
  token_type: string,
  refresh_token: string,
};

export type AccessTokenRequest = { grant_type: 'authorization_code', code: string } | { grant_type: 'refresh_token', refresh_token: string };

export type AccessTokenResponse = AmazonTokensBase & {
  expires_in: number,
}

export type AmazonTokens = AmazonTokensBase & {
  expires_at: number,
  region: AwsRegion,
}
