import config from '../config'
import { AwsAlexaGatewayRegion, AwsRegion } from '../types'

export const SKILL_NAME = 'Kodi'

const LOCALES: string[] = [
  'en-US',
  'en-GB',
  'en-AU',
  'en-IN',
  'en-CA',
  'de-DE',
  'fr-FR',
  'fr-CA',
  'it-IT',
  'ja-JP',
  'pt-BR',
  'es-MX',
  'es-ES',
  'es-US',
]

const DISTRIBUTION_COUNTRIES: string[] = LOCALES.map((locale) => locale.split('-')[1])

// const LOCALE_COUNTRY_MAP = {
//   'en-US': 'en',
//   'en-GB': 'en',
//   'en-AU': 'en',
//   'en-IN': 'en',
//   'en-CA': 'en',
//   'de-DE': 'de',
//   'fr-FR': 'fr',
//   'fr-CA': 'fr',
//   'it-IT': 'it',
//   'ja-JP': 'ja',
//   'pt-BR': 'pt',
//   'es-MX': 'es',
//   'es-ES': 'es',
//   'es-US': 'es',
// };

// type Locale = $Keys<LOCALE_COUNTRY_MAP>;
// type DistributionCountry = $Values<LOCALE_COUNTRY_MAP>;

export const REGION_GATEWAY_MAP: {
  [key: AwsRegion]: AwsAlexaGatewayRegion
} = {
  us: 'us',
  ap: 'fe',
  ca: 'us',
  cn: 'fe',
  eu: 'eu',
  sa: 'eu',
}

export function createEmptySkillManifest() {
  return {
    publishingInformation: {
      locales: LOCALES.reduce(
        (acc, locale) => ({
          ...acc,
          [locale]: {
            summary: 'Control Kodi with your voice',
            examplePhrases: ['Alexa, Play Interstellar', 'Alexa, Next', 'Alexa, Previous'],
            keywords: ['kodi', 'xbmc'],
            name: SKILL_NAME,
            smallIconUri:
              'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa-small.png',
            description:
              'Connects your Kodi devices with Alexa, allowing you to control it with your voice.\n' +
              'Play and display movies by name, genre, actors, etc.\n' +
              'Play tv shows by episodes, or by next unwatched episode.\n' +
              'Control playback (pause, resume, fast forward, etc.)',
            largeIconUri:
              'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa.png',
          },
        }),
        {}
      ),
      isAvailableWorldwide: false,
      testingInstructions: 'TODO',
      category: 'SMART_HOME',
      distributionCountries: DISTRIBUTION_COUNTRIES,
    },
    apis: {
      video: {
        locales: LOCALES.reduce(
          (acc, locale) => ({
            ...acc,
            [locale]: {
              videoProviderTargetingNames: [SKILL_NAME],
            },
          }),
          {}
        ),
      },
    },
    manifestVersion: '1.0',
  }
}

export function createSkillManifest(lambdaArn: string) {
  return {
    publishingInformation: {
      locales: LOCALES.reduce(
        (acc, locale) => ({
          ...acc,
          [locale]: {
            summary: 'Control Kodi with your voice',
            examplePhrases: ['Alexa, Play Interstellar', 'Alexa, Next', 'Alexa, Previous'],
            keywords: ['kodi', 'xbmc'],
            name: SKILL_NAME,
            smallIconUri:
              'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa-small.png',
            description:
              'Connects your Kodi devices with Alexa, allowing you to control it with your voice.\n' +
              'Play and display movies by name, genre, actors, etc.\n' +
              'Play tv shows by episodes, or by next unwatched episode.\n' +
              'Control playback (pause, resume, fast forward, etc.)',
            largeIconUri:
              'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa.png',
          },
        }),
        {}
      ),
      isAvailableWorldwide: false,
      testingInstructions: 'TODO',
      category: 'SMART_HOME',
      distributionCountries: DISTRIBUTION_COUNTRIES,
    },
    apis: {
      video: {
        locales: LOCALES.reduce(
          (acc, locale) => ({
            ...acc,
            [locale]: {
              videoProviderTargetingNames: [SKILL_NAME],
            },
          }),
          {}
        ),
        endpoint: {
          uri: lambdaArn,
        },
      },
    },
    manifestVersion: '1.0',
    permissions: [
      {
        name: 'alexa::async_event:write',
      },
    ],
    privacyAndCompliance: {
      allowsPurchases: false,
      locales: LOCALES.reduce(
        (acc, locale) => ({
          ...acc,
          [locale]: {
            termsOfUseUrl: `${config.hostUrl}/terms-of-use/alexa`,
            privacyPolicyUrl: `${config.hostUrl}/privacy-policy/alexa`,
          },
        }),
        {}
      ),
      isExportCompliant: true,
      containsAds: false,
      isChildDirected: false,
      usesPersonalInfo: false,
    },
  }
}

export const ACCOUNT_LINKING = {
  skipOnEnablement: false,
  accessTokenScheme: 'HTTP_BASIC',
  accessTokenUrl: `${config.hostUrl}/oauth/token`,
  authorizationUrl: `${config.hostUrl}/oauth/authorize`,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  defaultTokenExpirationInSeconds: 3600,
  domains: [],
  scopes: ['command'],
  type: 'AUTH_CODE',
}
