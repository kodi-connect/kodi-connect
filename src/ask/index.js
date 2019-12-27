// @flow

import { VENDOR_ID, ACCOUNT_LINKING, createSkillManifest } from './constants';
import createLogger from '../logging';
import { askRequest } from './api';
import { sleep } from '../util/time';

const logger = createLogger('ask');


export async function getVendors(lwaCredentials: Object) {
  logger.info('getVendors');
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: '/v1/vendors',
    });

    return response.data.vendors;
  } catch (error) {
    logger.error('Get Vendors failed', { error });
    throw Error('Get Vendors failed');
  }
}

export async function getVendorId(lwaCredentials: Object): Promise<string> {
  const vendors = await getVendors(lwaCredentials);
  const vendor = vendors.find((v) => v.roles.includes('ROLE_ADMINISTRATOR'));
  if (!vendor) {
    logger.error('Vendor ID not found', { vendors });
    throw new Error('Vendor ID not found');
  }
  return vendor.id;
}


export async function getSkills(lwaCredentials: Object) {
  logger.info('getSkills');

  const vendorId = await getVendorId(lwaCredentials);

  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: '/v1/skills',
      params: {
        vendorId,
      },
    });

    return response.data.skills;
  } catch (error) {
    logger.error('Get Skills failed', { error, responseData: error.response && error.response.data });
    throw Error('Get Skills failed');
  }
}

export async function getSkillManifest(lwaCredentials: Object, skillId: string): Promise<Object> {
  logger.info('getSkillManifest');
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: `/v1/skills/${skillId}/stages/development/manifest`,
    });

    return response.data.manifest;
  } catch (error) {
    logger.error('Get Skill Manifest failed', { error, responseData: error.response && error.response.data });
    throw Error('Get Skill Manifest failed');
  }
}

export async function getSkill(lwaCredentials: Object): Promise<?Object> {
  const skills = await getSkills(lwaCredentials);
  const skill = skills.find((s) => s.apis.includes('video') && s.nameByLocale['en-US'] === 'Kodi');
  if (!skill) return null;

  const { skillId } = skill;

  const manifest = await getSkillManifest(lwaCredentials, skillId);
  return {
    skillId,
    manifest,
  };
}

async function getSkillStatus(lwaCredentials: Object, skillId: string) {
  logger.info('getSkillStatus', { skillId });
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: `/v1/skills/${skillId}/status`,
      params: {
        resource: 'manifest',
      },
    });

    return response.data.manifest.lastUpdateRequest;
  } catch (error) {
    logger.error('Get Skill Status failed', { error, responseData: error.response && error.response.data });
    throw Error('Get Skill Status failed');
  }
}

export async function getSkillCredentials(lwaCredentials: Object, skillId: string) {
  logger.info('getSkillCredentials', { skillId });
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'GET',
      path: `/v1/skills/${skillId}/credentials`,
      params: {
        resource: 'manifest',
      },
    });

    return response.data;
  } catch (error) {
    logger.error('Get Skill Credentials failed', { error, responseData: error.response && error.response.data });
    throw Error('Get Skill Credentials failed');
  }
}

async function waitForSkillCreation(lwaCredentials: Object, skillId: string, seconds: number = 5) {
  logger.info('waitForSkillCreation', { skillId, seconds });
  for (let i = 0; i < seconds; i += 1) {
    await sleep(1000);
    const { status, errors } = await getSkillStatus(lwaCredentials, skillId);
    switch (status) {
      case 'IN_PROGRESS':
        break;
      case 'SUCCEEDED':
        return;
      case 'FAILED':
        logger.error('Skill creation failed', { statusErrors: errors });
        throw Error('Skill creation failed');
      default:
        logger.error('Unknown skill status', { status });
    }
  }

  logger.error('Skill creation timeout', { skillId });
  throw Error('Skill creation timeout');
}

async function createSkill(lwaCredentials: Object, lambdaArn: string) {
  logger.info('createSkill');
  try {
    const response = await askRequest(lwaCredentials, {
      method: 'POST',
      path: '/v1/skills',
      data: {
        manifest: createSkillManifest(lambdaArn),
        vendorId: VENDOR_ID,
      },
    });

    return response.data.skillId;
  } catch (error) {
    logger.error('Create Skill failed', { error, responseData: error.response && error.response.data });
    throw Error('Create Skill failed');
  }
}

async function updateAccountLinking(lwaCredentials: Object, skillId: string) {
  logger.info('updateAccountLinking', { skillId });
  try {
    await askRequest(lwaCredentials, {
      method: 'PUT',
      path: `/v1/skills/${skillId}/stages/development/accountLinkingClient`,
      data: {
        accountLinkingRequest: ACCOUNT_LINKING,
      },
    });
  } catch (error) {
    logger.error('Update Skill account linking failed', { error, responseData: error.response && error.response.data });
    throw Error('Update Skill account linking failed');
  }
}

export async function deleteSkill(lwaCredentials: Object, skillId: string) {
  logger.info('deleteSkill', { skillId });
  try {
    await askRequest(lwaCredentials, {
      method: 'DELETE',
      path: `/v1/skills/${skillId}`,
    });
  } catch (error) {
    logger.error('Delete Skill failed', { error });
    throw Error('Delete Skill failed');
  }
}

export async function addSkill(lwaCredentials: Object, lambdaArn: string): Promise<string> {
  logger.info('addSkill');
  let skillId;
  try {
    skillId = await createSkill(lwaCredentials, lambdaArn);
    await waitForSkillCreation(lwaCredentials, skillId);
    await updateAccountLinking(lwaCredentials, skillId);
  } catch (error) {
    try {
      if (skillId) await deleteSkill(lwaCredentials, skillId);
    } catch (deleteError) {
      logger.error('Failed to cleanup hanging skill', { error: deleteError, skillId, responseData: error.response && error.response.data });
    }
    throw error;
  }

  return skillId;
}
