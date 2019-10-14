// @flow

export function isLoggedIn(req) {
  return !!req.session.user;
}

function isAdmin(req) {
  return isLoggedIn(req) && req.session.user.admin === true;
}

export function isLoggedInMiddleware(shouldBeLoggedIn: boolean) {
  return (req, res, next) => {
    if (isLoggedIn(req) !== shouldBeLoggedIn) {
      res.redirect('/');
      return;
    }
    next();
  };
}

export function isAdminMiddleware(req, res, next) {
  if (!isAdmin(req)) {
    res.redirect('/');
    return;
  }
  next();
}
