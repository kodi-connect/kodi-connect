// @flow

import { Router } from 'express';
import qs from 'querystring';
import _ from 'lodash';
import { wrapAsync } from '../util/api';
import createLogger from '../logging';
import { createUser, getUser } from '../users';
import { validateEmail } from '../util/email';

const OAUTH_FIELDS = ['state', 'response_type', 'redirect', 'client_id', 'client_secret', 'redirect_uri'];

const logger = createLogger('routes/auth');

const router = new Router({ mergeParams: true });

router.post('/login', wrapAsync(async (req, res) => {
  const username = req.body.email && req.body.email.toLowerCase();
  const { password } = req.body;

  if (!username || !password) {
    req.session.errorMessage = 'Missing username and/or password';
    const queryString = qs.stringify(_.pick(req.body, OAUTH_FIELDS));
    res.redirect(`/login?${queryString}`);
    return;
  }

  const user = await getUser(username, password);
  if (!user) {
    res.render('login', { ..._.pick(req.body, OAUTH_FIELDS), error: 'Failed to log in' });
    return;
  }

  logger.info('User:', { user });

  req.session.user = user;

  const path = req.body.redirect || '/';

  logger.info('Redirecting', { path });

  const queryString = qs.stringify(_.pick(req.body, OAUTH_FIELDS));

  res.redirect(`${path}?${queryString}`);
}));

router.post('/logout', wrapAsync(async (req, res) => {
  req.session.user = undefined;
  res.redirect('/login');
}));

function validatePassword(password: string) {
  if (password.length === 0) return false;
  return true;
}

router.post('/register', wrapAsync(async (req, res) => {
  logger.info('Registering user', { email: req.body.email });

  const email = req.body.email && req.body.email.toLowerCase().trim();
  const password = req.body.password && req.body.password.trim();
  const repeatPassword = req.body.repeatPassword && req.body.repeatPassword.trim();

  if (!email || !password || !repeatPassword
    || !validateEmail(email) || !validatePassword(password) || !validatePassword(repeatPassword)
    || password !== repeatPassword
  ) {
    req.session.errorMessage = 'Invalid values';
    res.redirect('/register');
    return;
  }

  const result = await createUser(email, password);

  switch (result) {
    case 'created':
      res.render('check-email');
      break;
    case 'email_duplicity':
      logger.info('Email duplicity', { email });
      req.session.errorMessage = 'Email duplicity';
      res.redirect('/register');
      break;
    default:
      throw new Error(`Unknown RegistrationResult: ${result}`);
  }
}));

export default router;
