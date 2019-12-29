export function isLoggedIn(req: Record<string, any>) {
  return !!req.session.user
}

function isAdmin(req: Record<string, any>) {
  return isLoggedIn(req) && req.session.user.admin === true
}

export function isLoggedInMiddleware(shouldBeLoggedIn: boolean) {
  return (req: Record<string, any>, res: Record<string, any>, next: Function) => {
    if (isLoggedIn(req) !== shouldBeLoggedIn) {
      res.redirect('/')
      return
    }
    next()
  }
}

export function isAdminMiddleware(
  req: Record<string, any>,
  res: Record<string, any>,
  next: Function
) {
  if (!isAdmin(req)) {
    res.redirect('/')
    return
  }
  next()
}
