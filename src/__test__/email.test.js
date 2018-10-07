// @flow

import { validateEmail } from '../util/email';

test('Test email validation', () => {
  expect(validateEmail('somename@somedomain.net')).toEqual(true);
  expect(validateEmail('somename@somedomain.co.uk')).toEqual(true);
  expect(validateEmail('somename+anothername@somedomain.co.uk')).toEqual(true);

  expect(validateEmail('')).toEqual(false);
  expect(validateEmail('none')).toEqual(false);
});
