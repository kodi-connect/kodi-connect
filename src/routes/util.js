// @flow

export function isLoggedIn(req: Object) {
  return !!req.session.user;
}

function isAdmin(req: Object) {
  return isLoggedIn(req) && req.session.user.admin === true;
}

export function isLoggedInMiddleware(shouldBeLoggedIn: boolean) {
  return (req: Object, res: Object, next: Function) => {
    if (isLoggedIn(req) !== shouldBeLoggedIn) {
      res.redirect('/');
      return;
    }
    next();
  };
}

export function isAdminMiddleware(req: Object, res: Object, next: Function) {
  if (!isAdmin(req)) {
    res.redirect('/');
    return;
  }
  next();
}
