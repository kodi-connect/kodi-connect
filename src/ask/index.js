// @flow

import { ACCOUNT_LINKING, SKILL_MANIFEST } from './constants';
import createLogger from '../logging';
import { askRequest } from './api';
import { daysBeforeNow, daysFromNow, sleep } from '../util/time';
import { AlexaSkills } from '../params';

type BetaTestStatus = 'IN_DRAFT' | 'RUNNING' | 'STOPPING' | 'STARTING';

type Tester = {
  associationDate: string,
  emailId: string,
  invitationStatus: 'ACCEPTED' | 'NOT_ACCEPTED',
  isReminderAllowed: boolean,
}

type BetaTest = {
  expiryDate: string,
  feedbackEmail: string,
  invitationUrl: string,
  invitesRemaining: number,
  status: BetaTest
}

class BetaTestNotFound extends Error {
  constructor() {
    super('Beta test not found');
  }
}

class AlexaSkillNotFound extends Error {
  constructor() {
    super('Alexa Skill not found');
  }
}

const logger = createLogger('ask');

function testerValid(tester: Tester): boolean {
  return tester.invitationStatus === 'ACCEPTED' || daysBeforeNow(tester.associationDate) < 3;
}

async function getSkillStatus(skillId: string) {
  try {
    const response = await askRequest({
      method: 'GET',
      path: `/v1/skills/${skillId}/status`,
      params: {
        resource: 'manifest',
      },
    });

    return response.data.manifest.lastUpdateRequest;
  } catch (error) {
    logger.error('Create Skill failed', { error });
    throw Error('Create Skill failed');
  }
}

async function waitForSkillCreation(skillId: string, seconds: number = 5) {
  for (let i = 0; i < seconds; i += 1) {
    await sleep(1000);
    const { status, errors } = await getSkillStatus(skillId);
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

async function createSkill() {
  try {
    const response = await askRequest({
      method: 'POST',
      path: '/v1/skills',
      data: {
        manifest: SKILL_MANIFEST,
        vendorId: 'M26THQ9LJL7SS3',
      },
    });

    return response.data.skillId;
  } catch (error) {
    logger.error('Create Skill failed', { error });
    throw Error('Create Skill failed');
  }
}

async function updateAccountLinking(skillId: string) {
  try {
    await askRequest({
      method: 'PUT',
      path: `/v1/skills/${skillId}/stages/development/accountLinkingClient`,
      data: {
        accountLinkingRequest: ACCOUNT_LINKING,
      },
    });
  } catch (error) {
    logger.error('Update Skill account linking failed', { error });
    throw Error('Update Skill account linking failed');
  }
}

export async function deleteSkill(skillId: string) {
  try {
    await askRequest({
      method: 'DELETE',
      path: `/v1/skills/${skillId}`,
    });
  } catch (error) {
    logger.error('Delete Skill failed', { error });
    throw Error('Delete Skill failed');
  }
}

async function createBetaTest(skillId: string) {
  try {
    await askRequest({
      method: 'POST',
      path: `/v1/skills/${skillId}/betaTest`,
      data: {
        feedbackEmail: 'kislan.tomas@gmail.com',
      },
    });
  } catch (error) {
    logger.error('Create Skill beta test failed', { error });
    throw Error('Create Skill beta test failed');
  }
}

async function startBetaTest(skillId: string) {
  try {
    await askRequest({
      method: 'POST',
      path: `/v1/skills/${skillId}/betaTest/start`,
      data: {
        feedbackEmail: 'kislan.tomas@gmail.com',
      },
    });
  } catch (error) {
    logger.error('Start Skill beta test failed', { error });
    throw Error('Start Skill beta test failed');
  }
}

async function endBetaTest(skillId: string) {
  try {
    await askRequest({
      method: 'POST',
      path: `/v1/skills/${skillId}/betaTest/end`,
    });
  } catch (error) {
    logger.error('End Skill beta test failed', { error });
    throw Error('End Skill beta test failed');
  }
}

async function getBetaTest(skillId: string): Promise<BetaTest> {
  try {
    const response = await askRequest({
      method: 'GET',
      path: `/v1/skills/${skillId}/betaTest`,
    });

    return response.data;
  } catch (error) {
    if (error.response.status === 404) throw new BetaTestNotFound();
    logger.error('Get beta test failed', { error });
    throw Error('Get beta test failed');
  }
}

async function waitForSkillBetaTestStatus(skillId: string, expectedStatus: BetaTestStatus, seconds: number = 30) {
  for (let i = 0; i < seconds; i += 1) {
    await sleep(5000);
    const { status } = await getBetaTest(skillId);
    switch (status) {
      case expectedStatus:
        return;
      case 'IN_DRAFT':
      case 'RUNNING':
      case 'STARTING':
      case 'STOPPING':
        break;
      default:
        logger.error('Unknown skill beta test status', { status });
    }
  }

  logger.error('Skill beta test status timeout', { skillId });
  throw Error('Skill beta test status timeout');
}

async function waitForSkillBetaTestEnd(skillId: string, seconds: number = 30) {
  for (let i = 0; i < seconds; i += 1) {
    await sleep(5000);

    try {
      await getBetaTest(skillId);
    } catch (error) {
      if (error instanceof BetaTestNotFound) return;
      throw error;
    }
  }

  logger.error('Skill beta test status end timeout', { skillId });
  throw Error('Skill beta test status end timeout');
}

export async function getBetaTestTesters(skillId: string) {
  try {
    const response = await askRequest({
      method: 'GET',
      path: `/v1/skills/${skillId}/betaTest/testers`,
      params: {
        maxResults: 500,
      },
    });

    return response.data;
  } catch (error) {
    logger.error('Get Skill beta test testers failed', { error });
    throw Error('Get Skill beta test testers failed');
  }
}

async function addBetaTesters(skillId: string, emails: string[]) {
  logger.info('Adding beta testers', { emails });

  try {
    await askRequest({
      method: 'POST',
      path: `/v1/skills/${skillId}/betaTest/testers/add`,
      data: {
        testers: emails.map(email => ({ emailId: email })),
      },
    });
  } catch (error) {
    const { violations } = (error.response && error.response.data) || {};

    logger.error('Failed to add emails', { violations });

    const errorMessage = (violations && violations[0] && violations[0].message) || 'Failed to add beta test tester';

    throw Error(errorMessage);
  }
}

async function removeBetaTesters(skillId: string, emails: string[]) {
  logger.info('Removing beta testers', { emails });

  try {
    await askRequest({
      method: 'POST',
      path: `/v1/skills/${skillId}/betaTest/testers/remove`,
      data: {
        testers: emails.map(email => ({ emailId: email })),
      },
    });
  } catch (error) {
    logger.error('Remove Skill beta testers failed', { error });
    throw Error('Remove Skill beta testers failed');
  }
}

function isBetaTestEnding(betaTest: BetaTest): boolean {
  return daysFromNow(betaTest.expiryDate) < 5;
}

export async function isSkillBetaTestEnding(skillId: string) {
  const betaTest = await getBetaTest(skillId);
  logger.info('betaTest daysFromNow', { daysBeforeNow: daysFromNow(betaTest.expiryDate), skillId });
  return isBetaTestEnding(betaTest);
}

export async function addSkill(): Promise<string> {
  let skillId;
  try {
    skillId = await createSkill();
    await waitForSkillCreation(skillId);
    await updateAccountLinking(skillId);
    await createBetaTest(skillId);
    await waitForSkillBetaTestStatus(skillId, 'IN_DRAFT');
    await startBetaTest(skillId);
    await waitForSkillBetaTestStatus(skillId, 'RUNNING');
  } catch (error) {
    try {
      if (skillId) await deleteSkill(skillId);
    } catch (deleteError) {
      logger.error('Failed to cleanup hanging skill', { error, skillId });
    }
    throw error;
  }

  return skillId;
}

export async function restartBetaTest(skillId: string) {
  const { testers } = await getBetaTestTesters(skillId);
  await endBetaTest(skillId);
  await waitForSkillBetaTestEnd(skillId);
  await createBetaTest(skillId);
  await waitForSkillBetaTestStatus(skillId, 'IN_DRAFT');
  await startBetaTest(skillId);

  const validEmails = testers.filter(testerValid).map(tester => tester.emailId);

  await addBetaTesters(skillId, validEmails);
}

function pickBestAlexaSkill(alexaSkillsWithBetaTests: Object[]) {
  return alexaSkillsWithBetaTests.find(({ betaTest }) => betaTest.invitesRemaining > 0);
}

async function getBestAlexaSkill(): Promise<{ skillId: string, invitationUrl: string }> {
  const alexaSkills = await AlexaSkills.getValue([]);

  const alexaSkillsWithBetaTests = await Promise.all(alexaSkills.map(async (skillId) => {
    const betaTest = await getBetaTest(skillId);
    return { skillId, betaTest };
  }));

  const bestAlexaSkillWithBetaTest = pickBestAlexaSkill(alexaSkillsWithBetaTests);

  if (!bestAlexaSkillWithBetaTest) {
    logger.error('Probably need to add a new Alexa Skill');
    throw new AlexaSkillNotFound();
  }

  return {
    skillId: bestAlexaSkillWithBetaTest.skillId,
    invitationUrl: bestAlexaSkillWithBetaTest.betaTest.invitationUrl,
  };
}

export async function addBetaTester(email: string) {
  const { skillId, invitationUrl } = await getBestAlexaSkill();

  await addBetaTesters(skillId, [email]);

  return { skillId, invitationUrl };
}

export async function removeBetaTester(skillId: string, email: string) {
  await removeBetaTesters(skillId, [email]);
}

export async function getAlexaSkillsWithBetaTests(skillIds: string[]) {
  let skills = [];

  for (const skillId of skillIds) {
    try {
      const betaTest = await getBetaTest(skillId);
      skills = [...skills, { id: skillId, invitesRemaining: betaTest.invitesRemaining }];
    } catch (error) {
      logger.warn('Failed to get beta test', { error });
    }
  }

  return skills;
}
