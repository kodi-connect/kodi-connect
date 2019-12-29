import path from 'path'
import mongoose from 'mongoose'
import connectMongo from 'connect-mongo'
import session from 'express-session'
import bugsnag from 'bugsnag'
import express from 'express'
import http from 'http'
import _ from 'lodash'
import bodyParser from 'body-parser'
import OAuthServer from './external/express-oauth-server'
import config from './config'
import createTunnelServer from './tunnel-server'
import * as OAuthModel from './oauth-model'
import oauthRouter from './routes/oauth'
import createTemplatesRouter from './routes/templates'
import authRouter from './routes/auth'
import devicesRouter from './routes/devices'
import { isLoggedInMiddleware } from './routes/util'
import alexaSkillRouter from './routes/alexa-skill'
import createAlexaRouter from './api/alexa'
import createLogger from './logging'

const logger = createLogger('server')
mongoose.set('debug', true)

export default function createServer() {
  const MongoStore = connectMongo(session)

  mongoose.connect(config.mongoConnectString, error => {
    if (error) {
      logger.error('ERROR connecting to MongoDB', { error })
    } else {
      logger.info('Successfully connected to MongoDB')
    }
  })

  bugsnag.register(config.bugsnag.key, {
    notifyReleaseStages: ['production'],
    releaseStage: 'production',
  })

  const app = express()
  const server = http.createServer(app)

  app.use('/static', express.static(path.join(__dirname, 'static')))

  const kodiInstances = createTunnelServer(server, '/ws')

  app.set('view engine', 'pug')
  app.set('views', path.join(__dirname, 'views'))

  app.use(
    session({
      secret: config.sessionSecret,
      store: new MongoStore({
        mongooseConnection: mongoose.connection,
      }),
      saveUninitialized: false,
      resave: false,
    })
  )

  app.use((req, res, next) => {
    if (req.session.errorMessage) {
      _.set(res, 'locals.app.errorMessage', req.session.errorMessage)
      req.session.errorMessage = undefined
    }

    next()
  })

  app.oauth = new OAuthServer({
    model: OAuthModel,
    debug: process.env.NODE_ENV === 'development',
  })

  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))

  app.use('/oauth', oauthRouter(app.oauth))
  app.use(createTemplatesRouter(kodiInstances))
  app.use(authRouter)
  app.use('/device', devicesRouter)
  app.use('/alexa-skill', isLoggedInMiddleware(true), alexaSkillRouter)
  app.use('/alexa', createAlexaRouter(app.oauth, kodiInstances))

  return server
}
