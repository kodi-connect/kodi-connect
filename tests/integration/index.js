/* eslint-disable no-console */

/*
This is a copy/paste (dummy) implementation, in order for autocomplete to work.
During test, it gets replaced by actual handler from recommended package.
*/

const axios = require('axios');

const KODI_CONNECT_URL = process.env.KODI_CONNECT_URL || null;

exports.handler = (event, context, callback) => {
  console.log(JSON.stringify(event, null, '  '));

  const data = {
    alexaRequest: {
      event,
      context,
    },
    meta: {
      region: (process.env.AWS_REGION || process.env.DEFAULT_AWS_REGION || 'us-east-1'),
      version: '<version>',
    },
  };

  axios({
    method: 'POST',
    url: `${KODI_CONNECT_URL}/alexa`,
    data,
  }).then((response) => {
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, '  '));
    callback(null, response.data);
  }, (error) => {
    console.error('Handler failed:', error.message);
    callback(error);
  });
};
