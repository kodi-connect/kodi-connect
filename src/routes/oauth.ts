import qs from 'querystring'
import { Router } from 'express'
import { wrapAsync, wrapAsyncMiddleware } from '../util/api'
import createLogger from '../logging'

const logger = createLogger('routes/oauth')

export default function createOAuthRouter(oauth: Record<string, any>) {
  const router = new Router({ mergeParams: true })

  // Post token.
  router.post('/token', oauth.token())

  // Get authorization.
  router.get(
    '/authorize',
    wrapAsync(async (req, res) => {
      logger.debug('Authorize page', req.query)

      // Redirect anonymous users to login page.
      if (!req.session.user) {
        const queryString = qs.stringify({
          redirect: `${req.baseUrl}${req.path}`,
          ...req.query,
        })
        res.redirect(`/login?${queryString}`)
        return
      }

      res.render('authorize', {
        ...req.query,
        username: req.session.user.username,
      })
    })
  )

  router.post(
    '/authorize',
    wrapAsyncMiddleware(async (req, res, next) => {
      logger.debug('Authorize request', req.body)

      if (req.body.logout !== undefined) {
        req.session.user = undefined
        res.send('Logged out')
        return
      }

      next()
    })
  )

  router.post(
    '/authorize',
    oauth.authorize({
      authenticateHandler: {
        handle: req => (req.session.user ? { username: req.session.user.username } : null),
      },
    })
  )

  router.get('/redirect_uri', (req, res) => {
    res.send('OK')
  })

  return router
}
