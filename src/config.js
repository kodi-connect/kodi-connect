// @flow

const config = {
  amazonAuthUrl: 'https://api.amazon.com/auth/o2/token',
  amazonClientId: process.env.AMAZON_CLIENT_ID || 'dummy_client_id',
  amazonClientSecret: process.env.AMAZON_CLIENT_SECRET || 'dummy_client_secret',
  amazonEventGatewayUrl: {
    us: 'https://api.fe.amazonalexa.com/v3/events', // North America
    eu: 'https://api.eu.amazonalexa.com/v3/events', // Europe
    fe: 'https://api.fe.amazonalexa.com/v3/events', // Far East
  },
  amazonLambda: {
    us: process.env.AMAZON_LAMBDA_US,
    eu: process.env.AMAZON_LAMBDA_EU,
  },

  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,

  hostUrl: process.env.HOST_URL || (process.env.NODE_ENV === 'development' && 'http://localhost:3005'),

  emailAddress: process.env.EMAIL_ADDRESS,
  emailPassword: process.env.EMAIL_PASSWORD,

  bugsnag: {
    key: process.env.BUGSNAG_KEY,
  },
};

export default config;
