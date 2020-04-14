import qs from 'querystring'
import { Router } from 'express'
import { wrapAsync } from '../util/api'
import { accessTokenRequest, accessTokenValid, transformAccessTokenData } from '../ask/api'
import { addSkill, deleteSkill, getSkill, finalizeSkill } from '../ask'
import config from '../config'
import createLogger from '../logging'

const logger = createLogger('routes/alexa-skill')

const router = new Router({ mergeParams: true })

router.get(
  '/',
  wrapAsync(async (req, res) => {
    if (!req.session.lwaCredentials || !accessTokenValid(req.session.lwaCredentials.expires_at)) {
      res.redirect('/alexa-skill/lwa')
      return
    }

    logger.info('LWA Credentials', { lwaCredentials: req.session.lwaCredentials })

    const skill = await getSkill(req.session.lwaCredentials)

    const vars: { skillId?: string; lambdaArn?: boolean } = {}

    if (skill) {
      vars.skillId = skill.skillId

      vars.lambdaArn =
        skill.manifest &&
        skill.manifest.apis &&
        skill.manifest.apis.video &&
        skill.manifest.apis.video.endpoint &&
        skill.manifest.apis.video.endpoint.uri
    }

    res.render('alexa-skill', vars)
  })
)

router.post(
  '/create',
  wrapAsync(async (req, res) => {
    if (!req.session.lwaCredentials || !accessTokenValid(req.session.lwaCredentials.expires_at)) {
      res.redirect('/alexa-skill/lwa')
      return
    }

    logger.info('Creating skill')

    const skill = await getSkill(req.session.lwaCredentials)

    if (skill) {
      await deleteSkill(req.session.lwaCredentials, skill.skillId)
    }

    await addSkill(req.session.lwaCredentials)

    res.redirect('/alexa-skill')
  })
)

router.post(
  '/update',
  wrapAsync(async (req, res) => {
    if (!req.session.lwaCredentials || !accessTokenValid(req.session.lwaCredentials.expires_at)) {
      res.redirect('/alexa-skill/lwa')
      return
    }

    const { lambda_arn: lambdaArn } = req.body

    if (!lambdaArn) {
      logger.error('Missing lambdaArn', { reqBody: req.body })
      res.redirect('/alexa-skill')
      return
    }

    logger.info('Creating skill', { lambdaArn })

    const skill = await getSkill(req.session.lwaCredentials)
    if (!skill) {
      throw new Error("Skill doesn't exist")
    }

    const { skillId } = skill
    await finalizeSkill(req.session.lwaCredentials, skillId, lambdaArn)

    res.redirect('/alexa-skill')
  })
)

router.post(
  '/delete',
  wrapAsync(async (req, res) => {
    if (!req.session.lwaCredentials || !accessTokenValid(req.session.lwaCredentials.expires_at)) {
      res.redirect('/alexa-skill/lwa')
      return
    }

    const skill = await getSkill(req.session.lwaCredentials)

    if (!skill) {
      res.redirect('/alexa-skill')
      return
    }

    const { skillId } = skill
    await deleteSkill(req.session.lwaCredentials, skillId)

    res.redirect('/alexa-skill')
  })
)

router.get(
  '/lwa',
  wrapAsync(async (req, res) => {
    // TODO - Check for credentials on the session
    const query = qs.stringify({
      client_id: config.lwaClientId,
      scope: 'alexa::ask:skills:readwrite',
      response_type: 'code',
      redirect_uri: `${config.hostUrl}/alexa-skill/lwa/redirect_uri`,
    })
    res.redirect(`https://www.amazon.com/ap/oa?${query}`)
  })
)

router.get(
  '/lwa/redirect_uri',
  wrapAsync(async (req, res) => {
    try {
      const accessTokenData = await accessTokenRequest(req.query.code)

      req.session.lwaCredentials = transformAccessTokenData(accessTokenData)
    } catch (error) {
      logger.error('Failed to get Amazon tokens', {
        originalError: error,
        responseData: error.response && error.response.data,
      })
    }

    res.redirect('/alexa-skill')
  })
)

export default router
