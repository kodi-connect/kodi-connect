// @flow

function getHostUrl(): string {
  const hostUrl = process.env.HOST_URL || (process.env.NODE_ENV === 'development' && 'http://localhost:3005');
  if (!hostUrl) throw new Error('HOST_URL not defined');
  return hostUrl;
}

const config = Object.freeze({
  mongoConnectString: process.env.MONGO_URL,

  sessionSecret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'development' && 'TopSecret'),

  amazonAuthUrl: 'https://api.amazon.com/auth/o2/token',
  amazonClientCredentials: [
    [
      process.env.AMAZON_CLIENT_ID || 'dummy_client_id',
      process.env.AMAZON_CLIENT_SECRET || 'dummy_client_secret',
    ],
    [
      process.env.AMAZON_CLIENT_ID_2 || 'dummy_client_id',
      process.env.AMAZON_CLIENT_SECRET_2 || 'dummy_client_secret',
    ],
    [
      process.env.AMAZON_CLIENT_ID_3 || 'dummy_client_id',
      process.env.AMAZON_CLIENT_SECRET_3 || 'dummy_client_secret',
    ],
  ],
  amazonEventGatewayUrl: {
    us: 'https://api.fe.amazonalexa.com/v3/events', // North America
    eu: 'https://api.eu.amazonalexa.com/v3/events', // Europe
    fe: 'https://api.fe.amazonalexa.com/v3/events', // Far East
  },
  amazonLambda: {
    us: process.env.AMAZON_LAMBDA_US,
    eu: process.env.AMAZON_LAMBDA_EU,
  },

  lwaClientId: process.env.LWA_CLIENT_ID || 'dummy_client_id',
  lwaClientSecret: process.env.LWA_CLIENT_SECRET || 'dummy_client_secret',

  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,

  hostUrl: getHostUrl(),

  emailAddress: process.env.EMAIL_ADDRESS,
  emailPassword: process.env.EMAIL_PASSWORD,

  bugsnag: {
    key: process.env.BUGSNAG_KEY,
  },
});

if (!config.mongoConnectString) throw new Error('MONGO_URL not defined');
if (!config.sessionSecret) throw new Error('SESSION_SECRET not defined');

export default config;
