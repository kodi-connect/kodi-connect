import qs from 'querystring'
import { Router } from 'express'
import { wrapAsync } from '../util/api'
import { accessTokenRequest, accessTokenValid, transformAccessTokenData } from '../ask/api'
import { addSkill, deleteSkill, getSkill, getSkillCredentials } from '../ask'
import { storeAlexaSkillMessagingCredentials } from '../users'
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

    const vars = {}

    if (skill) {
      logger.info('Skill', { skill })
      const { skillId } = skill

      vars.skillId = skillId

      const skillCredentials = await getSkillCredentials(req.session.lwaCredentials, skillId)
      logger.info('skillCredentials', { skillCredentials })
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

    const { lambda_arn: lambdaArn } = req.body

    if (!lambdaArn) {
      logger.error('Missing lambdaArn', { reqBody: req.body })
      res.redirect('/alexa-skill')
      return
    }

    logger.info('Creating skill', { lambdaArn })

    const skillId = await addSkill(req.session.lwaCredentials, lambdaArn)

    try {
      const skillCredentials = await getSkillCredentials(req.session.lwaCredentials, skillId)

      const { skillMessagingCredentials } = skillCredentials
      await storeAlexaSkillMessagingCredentials(
        req.session.user.username,
        skillMessagingCredentials
      )
    } catch (error) {
      logger.error('Failed to store alexa skill messaging credentials', {
        originalError: error,
        skillId,
      })
      await deleteSkill(req.session.lwaCredentials, skillId)
    }

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
