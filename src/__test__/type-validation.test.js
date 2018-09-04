// @flow

import type { AccessTokenResponse, AwsRegion } from '../types';
import { validateAccessTokenResponse, validateAwsRegion } from '../type-validation';

function validate<T>(valid: T[], invalid: any[], fn: (any) => T) {
  for (const value of valid) {
    expect(fn(value)).toBe(value);
  }

  for (const value of invalid) {
    let validatedValue: T;
    try {
      validatedValue = fn(value);
    } catch (error) { } // eslint-disable-line no-empty
    expect(validatedValue).toBeUndefined();
  }
}

describe('Amazon types', () => {
  test('AccessTokenResponse', () => {
    const valid: AccessTokenResponse[] = [
      {
        access_token: 'sfasfa',
        token_type: 'asdafasf',
        refresh_token: 'abcd',
        expires_in: 3600,
      },
    ];

    const invalid = [
      { token_type: 'asdafasf', refresh_token: 'abcd', expires_in: 3600 },
      { access_token: 'sfasfa', refresh_token: 'abcd', expires_in: 3600 },
      { access_token: 'sfasfa', token_type: 'asdafasf', expires_in: 3600 },
      { access_token: 'sfasfa', token_type: 'asdafasf', refresh_token: 'abcd' },
      null,
      undefined,
      {},
    ];

    validate(valid, invalid, validateAccessTokenResponse);
  });

  test('AwsRegion', () => {
    const valid: AwsRegion[] = ['us', 'eu', 'fe'];

    const invalid = ['', 'abc', 'ap', 'ca', 'cn', 'sa', null, undefined, {}, [], ['us', 'eu'], ['us']];

    validate(valid, invalid, validateAwsRegion);
  });
});
