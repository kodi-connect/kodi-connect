import {
  ACCOUNT_LINKING,
  createSkillManifest,
  createEmptySkillManifest,
  SKILL_NAME,
} from './constants'
import createLogger from '../logging'
import { askRequest } from './api'
import { sleep } from '../util/time'

const logger = createLogger('ask')

export async function getVendors(lwaCredentials: Record<string, any>) {
  logger.info('getVendors')
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: '/v1/vendors',
    })

    return response.data.vendors
  } catch (error) {
    logger.error('Get Vendors failed', { originalError: error })
    throw Error('Get Vendors failed')
  }
}

export async function getVendorId(lwaCredentials: Record<string, any>): Promise<string> {
  const vendors = await getVendors(lwaCredentials)
  const vendor = vendors.find((v) => v.roles.includes('ROLE_ADMINISTRATOR'))
  if (!vendor) {
    logger.error('Vendor ID not found', { vendors })
    throw new Error('Vendor ID not found')
  }
  return vendor.id
}

export async function getSkills(lwaCredentials: Record<string, any>) {
  logger.info('getSkills')

  const vendorId = await getVendorId(lwaCredentials)

  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: '/v1/skills',
      params: {
        vendorId,
      },
    })

    return response.data.skills
  } catch (error) {
    logger.error('Get Skills failed', {
      originalError: error,
      responseData: error.response && error.response.data,
    })
    throw Error('Get Skills failed')
  }
}

export async function getSkillManifest(
  lwaCredentials: Record<string, any>,
  skillId: string
): Promise<Record<string, any>> {
  logger.info('getSkillManifest')
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: `/v1/skills/${skillId}/stages/development/manifest`,
    })

    return response.data.manifest
  } catch (error) {
    logger.error('Get Skill Manifest failed', {
      originalError: error,
      responseData: error.response && error.response.data,
    })
    throw Error('Get Skill Manifest failed')
  }
}

export async function getSkill(
  lwaCredentials: Record<string, any>
): Promise<Record<string, any> | null | undefined> {
  const skills = await getSkills(lwaCredentials)
  const skill = skills.find(
    (s) =>
      s &&
      s.apis &&
      s.apis.includes('video') &&
      s.nameByLocale &&
      s.nameByLocale['en-US'] === SKILL_NAME
  )
  if (!skill) return null

  const { skillId } = skill

  const manifest = await getSkillManifest(lwaCredentials, skillId)
  return {
    skillId,
    manifest,
  }
}

async function getSkillStatus(lwaCredentials: Record<string, any>, skillId: string) {
  logger.info('getSkillStatus', { skillId })
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: `/v1/skills/${skillId}/status`,
      params: {
        resource: 'manifest',
      },
    })

    return response.data.manifest.lastUpdateRequest
  } catch (error) {
    logger.error('Get Skill Status failed', {
      originalError: error,
      responseData: error.response && error.response.data,
    })
    throw Error('Get Skill Status failed')
  }
}

export async function getSkillCredentials(lwaCredentials: Record<string, any>, skillId: string) {
  logger.info('getSkillCredentials', { skillId })
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: `/v1/skills/${skillId}/credentials`,
    })

    return response.data
  } catch (error) {
    logger.error('Get Skill Credentials failed', {
      originalError: error,
      responseData: error.response && error.response.data,
    })
    throw Error('Get Skill Credentials failed')
  }
}

async function waitForSkillCreation(
  lwaCredentials: Record<string, any>,
  skillId: string,
  seconds = 30
): Promise<void> {
  logger.info('waitForSkillCreation', { skillId, seconds })
  for (let i = 0; i < seconds; i += 5) {
    await sleep(5000)
    const { status, errors } = await getSkillStatus(lwaCredentials, skillId)
    switch (status) {
      case 'IN_PROGRESS':
        break
      case 'SUCCEEDED':
        return
      case 'FAILED':
        logger.error('Skill creation failed', { statusErrors: errors })
        throw Error('Skill creation failed')
      default:
        logger.error('Unknown skill status', { status })
    }
  }

  logger.error('Skill creation timeout', { skillId })
  throw Error('Skill creation timeout')
}

export async function createEmptySkill(lwaCredentials: Record<string, any>): Promise<string> {
  logger.info('createEmptySkill')
  const vendorId = await getVendorId(lwaCredentials)
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'POST',
      path: '/v1/skills',
      data: {
        manifest: createEmptySkillManifest(),
        vendorId,
      },
    })

    return response.data.skillId
  } catch (error) {
    logger.error('Create Skill failed', {
      originalError: error,
      responseData: error.response && error.response.data,
    })
    throw Error('Create Skill failed')
  }
}

async function waitForSkillUpdateDone(
  lwaCredentials: Record<string, any>,
  seconds = 50
): Promise<void> {
  logger.info('waitForSkillUpdateDone', { seconds })
  let skill
  for (let i = 0; i < seconds; i += 5) {
    await sleep(5000)
    skill = await getSkill(lwaCredentials)
    if (
      skill.manifest &&
      skill.manifest.apis &&
      skill.manifest.apis.video &&
      skill.manifest.apis.video.endpoint
    ) {
      return
    }
  }

  logger.error('Skill update timeout', { skill })
  throw Error('Skill update timeout')
}

async function updateSkill(
  lwaCredentials: Record<string, any>,
  skillId: string,
  lambdaArn: string
): Promise<void> {
  logger.info('updateSkill', { skillId, lambdaArn })
  try {
    await askRequest(lwaCredentials, {
      method: 'PUT',
      path: `/v1/skills/${skillId}/stages/development/manifest`,
      data: { manifest: createSkillManifest(lambdaArn) },
    })
  } catch (error) {
    logger.error('Update Skill failed', {
      originalError: error,
      responseData: error.response && error.response.data,
    })
    throw Error('Update Skill failed')
  }
}

async function updateAccountLinking(
  lwaCredentials: Record<string, any>,
  skillId: string
): Promise<void> {
  logger.info('updateAccountLinking', { skillId })
  try {
    await askRequest(lwaCredentials, {
      method: 'PUT',
      path: `/v1/skills/${skillId}/stages/development/accountLinkingClient`,
      data: {
        accountLinkingRequest: ACCOUNT_LINKING,
      },
    })
  } catch (error) {
    logger.error('Update Skill account linking failed', {
      originalError: error,
      responseData: error.response && error.response.data,
    })
    throw Error('Update Skill account linking failed')
  }
}

export async function deleteSkill(
  lwaCredentials: Record<string, any>,
  skillId: string
): Promise<void> {
  logger.info('deleteSkill', { skillId })
  try {
    await askRequest(lwaCredentials, {
      method: 'DELETE',
      path: `/v1/skills/${skillId}`,
    })
  } catch (error) {
    logger.error('Delete Skill failed', { originalError: error })
    throw Error('Delete Skill failed')
  }
}

export async function addSkill(lwaCredentials: Record<string, any>): Promise<string> {
  logger.info('addSkill')
  let skillId
  try {
    skillId = await createEmptySkill(lwaCredentials)
    await waitForSkillCreation(lwaCredentials, skillId)
  } catch (error) {
    try {
      if (skillId) await deleteSkill(lwaCredentials, skillId)
    } catch (deleteError) {
      logger.error('Failed to cleanup hanging skill', {
        originalError: deleteError,
        skillId,
        responseData: error.response && error.response.data,
      })
    }
    throw error
  }

  return skillId
}

export async function finalizeSkill(
  lwaCredentials: Record<string, any>,
  skillId: string,
  lambdaArn: string
): Promise<string> {
  logger.info('finalizeSkill', { skillId, lambdaArn })
  try {
    await updateSkill(lwaCredentials, skillId, lambdaArn)
    await waitForSkillUpdateDone(lwaCredentials)
    await updateAccountLinking(lwaCredentials, skillId)
  } catch (error) {
    try {
      if (skillId) await deleteSkill(lwaCredentials, skillId)
    } catch (deleteError) {
      logger.error('Failed to cleanup hanging skill', {
        originalError: deleteError,
        skillId,
        responseData: error.response && error.response.data,
      })
    }
    throw error
  }

  return skillId
}
