/* @flow */

import _ from 'lodash';

import createLogger from './logging';

const logger = createLogger('utils');

export function wrapAsync(handler: Function) {
  return (req: Object, res: Object) => {
    const p = handler(req, res);

    let timedOut = false;

    const timerId = setTimeout(() => {
      timedOut = true;
      res.status(500).json({ error: 'Timed out' });
    }, 30000);

    p.then(
      () => {
        if (timedOut) return;
        clearTimeout(timerId);
      },
      (error) => {
        logger.error('Request failed', { error });
        if (timedOut) return;
        clearTimeout(timerId);
        res.status(500).json({ error: error.message });
      },
    );
  };
}

export function wrapAsyncMiddleware(handler: Function) {
  return (req: Object, res: Object, next: Function) => {
    const p = handler(req, res, next);

    let timedOut = false;

    // TODO - wrap next function to track that next was called
    const timerId = setTimeout(() => {
      timedOut = true;
      res.status(500).json({ error: 'Timed out' });
    }, 30000);

    p.then(
      () => {
        if (timedOut) return;
        clearTimeout(timerId);
      },
      (error) => {
        logger.error('Request middleware failed', { error });
        if (timedOut) return;
        clearTimeout(timerId);
        res.status(500).json({ error: error.message });
      },
    );
  };
}

export function parseAuthorizationHeader(req: Object): { username?: string, secret?: string } {
  const authRegex = /Basic (.*)/;
  const match = _.get(req, 'headers.authorization', '').match(authRegex);
  if (!match) return {};
  const auth = Buffer.from(match[1], 'base64').toString();

  const [username, secret] = auth.split(':');
  return { username: username.toLowerCase(), secret };
}
