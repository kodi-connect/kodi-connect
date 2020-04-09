import { Router } from 'express'
import _ from 'lodash'
import createLogger from '../logging'
import { isAdminMiddleware, isLoggedIn, isLoggedInMiddleware } from './util'
import { wrapAsync } from '../util/api'
import { confirmUserRegistration, getDevices } from '../users'
import { KodiInstances } from '../tunnel-server'

const logger = createLogger('routes/templates')

export default function createTemplatesRouter(kodiInstances: KodiInstances) {
  const router = new Router({ mergeParams: true })

  router.get(
    '/login',
    isLoggedInMiddleware(false),
    wrapAsync(async (req, res) => {
      logger.info('LOGIN', req.query)
      res.render('login', { ...req.query, error: _.get(res, 'locals.app.errorMessage') })
    })
  )

  router.get(
    '/register',
    isLoggedInMiddleware(false),
    wrapAsync(async (req, res) => {
      res.render('register', { error: _.get(res, 'locals.app.errorMessage') })
    })
  )

  router.get(
    '/confirm/:confirmationToken',
    wrapAsync(async (req, res) => {
      const result = await confirmUserRegistration(req.params.confirmationToken)
      logger.info('User registration confirmation', {
        confirmationToken: req.params.confirmationToken,
        result,
      })

      switch (result) {
        case 'confirmed':
          res.render('confirmed')
          break
        case 'already_confirmed':
          res.render('confirmed') // TODO - use different one

          break
        case 'not_found':
          res.sendStatus(400)
          break
        default:
          throw new Error(`Unknown ConfirmationResult: ${result}`)
      }
    })
  )

  router.get(
    '/devices',
    isLoggedInMiddleware(true),
    wrapAsync(async (req, res) => {
      const devices = await getDevices(req.session.user.username)
      const devicesWithStatus = devices.map((device) => ({
        ...device,
        connected: kodiInstances[device.id] != null,
      }))

      res.render('devices', {
        devices: devicesWithStatus,
        error: _.get(res, 'locals.app.errorMessage'),
      })
    })
  )

  router.get(
    '/terms-of-use/alexa',
    wrapAsync(async (req, res) => {
      res.render('alexa-terms-of-use', { hostname: req.hostname })
    })
  )

  router.get(
    '/privacy-policy/alexa',
    wrapAsync(async (req, res) => {
      res.render('alexa-privacy-policy', { hostname: req.hostname })
    })
  )

  router.get(
    '/admin',
    isAdminMiddleware,
    wrapAsync(async (req, res) => {
      res.render('admin', { error: _.get(res, 'locals.app.errorMessage') })
    })
  )

  router.get(
    '/',
    wrapAsync(async (req, res) => {
      if (!isLoggedIn(req)) {
        res.render('home')
        return
      }
      res.redirect('/devices')
    })
  )

  return router
}
