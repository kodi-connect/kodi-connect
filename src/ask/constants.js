// @flow

import config from '../config';

export const SKILL_MANIFEST = {
  publishingInformation: {
    locales: {
      'de-DE': {
        summary: 'Control Kodi with your voice',
        examplePhrases: [
          'Alexa, Play Interstellar',
          'Alexa, Next',
          'Alexa, Previous',
        ],
        keywords: [
          'kodi',
          'xbmc',
        ],
        name: 'Kodi',
        smallIconUri: 'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa-small.png',
        description: 'Connects your Kodi devices with Alexa, allowing you to control it with your voice.\nPlay and display movies by name, genre, actors, etc.\nPlay tv shows by episodes, or by next unwatched episode.\nControl playback (pause, resume, fast forward, etc.)',
        largeIconUri: 'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa.png',
      },
      'en-US': {
        summary: 'TODO',
        examplePhrases: [
          'Play Avengers',
          'Play Simpsons',
          'Stop',
        ],
        keywords: [
          'kodi',
        ],
        name: 'Kodi',
        smallIconUri: 'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa-small.png',
        description: 'Connects your Kodi devices with Alexa, allowing you to control it with your voice.\nPlay and display movies by name, genre, actors, etc.\nPlay tv shows by episodes, or by next unwatched episode.\nControl playback (pause, resume, fast forward, etc.)',
        largeIconUri: 'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa.png',
      },
      'en-GB': {
        summary: 'Control Kodi with your voice',
        examplePhrases: [
          'Alexa, Play Interstellar',
          'Alexa, Pause',
          'Alexa, Resume',
        ],
        keywords: [
          'kodi',
          'xbmc',
        ],
        name: 'Kodi',
        smallIconUri: 'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa-small.png',
        description: 'Connects your Kodi devices with Alexa, allowing you to control it with your voice.\nPlay and display movies by name, genre, actors, etc.\nPlay tv shows by episodes, or by next unwatched episode.\nControl playback (pause, resume, fast forward, etc.)',
        largeIconUri: 'https://github.com/kodi-connect/kodi-alexa-video/raw/master/icons/kodi-alexa.png',
      },
    },
    isAvailableWorldwide: false,
    testingInstructions: 'TODO',
    category: 'SMART_HOME',
    distributionCountries: [
      'DE',
      'GB',
      'US',
    ],
  },
  apis: {
    video: {
      locales: {
        'de-DE': {
          videoProviderTargetingNames: [
            'Kodi',
          ],
        },
        'en-US': {
          videoProviderTargetingNames: [
            'Kodi',
          ],
        },
        'en-GB': {
          videoProviderTargetingNames: [
            'Kodi',
          ],
        },
      },
      // endpoint: {
      //   uri: config.amazonLambda.us,
      // },
      // regions: {
      //   EU: {
      //     endpoint: {
      //       uri: config.amazonLambda.eu,
      //     },
      //   },
      //   NA: {
      //     endpoint: {
      //       uri: config.amazonLambda.us,
      //     },
      //   },
      // },
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
    locales: {
      'de-DE': {
        termsOfUseUrl: 'https://kodiconnect.kislan.sk/terms-of-use/alexa',
        privacyPolicyUrl: 'https://kodiconnect.kislan.sk/privacy-policy/alexa',
      },
      'en-US': {
        termsOfUseUrl: 'https://kodiconnect.kislan.sk/terms-of-use/alexa',
        privacyPolicyUrl: 'https://kodiconnect.kislan.sk/privacy-policy/alexa',
      },
      'en-GB': {
        termsOfUseUrl: 'https://kodiconnect.kislan.sk/terms-of-use/alexa',
        privacyPolicyUrl: 'https://kodiconnect.kislan.sk/privacy-policy/alexa',
      },
    },
    isExportCompliant: true,
    containsAds: false,
    isChildDirected: false,
    usesPersonalInfo: false,
  },
};

export const ACCOUNT_LINKING = {
  skipOnEnablement: false,
  accessTokenScheme: 'HTTP_BASIC',
  accessTokenUrl: 'https://kodiconnect.kislan.sk/oauth/token',
  authorizationUrl: 'https://kodiconnect.kislan.sk/oauth/authorize',
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  defaultTokenExpirationInSeconds: 3600,
  domains: [],
  scopes: [
    'command',
  ],
  type: 'AUTH_CODE',
};
