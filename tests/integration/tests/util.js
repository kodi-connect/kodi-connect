const fs = require('fs');

const axios = require('axios');
const { handler } = require('../index');

const KODI_CONNECT_URL = process.env.KODI_CONNECT_URL || null;

function removeFileIfExists(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function asyncHandler(event) {
  return new Promise((resolve, reject) => {
    handler(event, {}, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
  });
}

async function getAccessToken() {
  const resp = await axios({
    method: 'POST',
    url: `${KODI_CONNECT_URL}/oauth/token`,
    auth: {
      username: 'clientid',
      password: 'clientsecret',
    },
    data: new URLSearchParams({
      grant_type: 'password',
      scope: 'alexa',
      username: 'test@email.com',
      password: 'test',
    }),
  });
  return resp.data.access_token;
}

async function baseSetUp() {
  removeFileIfExists('/tmp/kodilog/kodi.log');
}

function getKodiLog() {
  return fs.readFileSync('/tmp/kodilog/kodi.log').toString();
}

exports.KODI_CONNECT_URL = KODI_CONNECT_URL;
exports.baseSetUp = baseSetUp;
exports.asyncHandler = asyncHandler;
exports.getAccessToken = getAccessToken;
exports.getKodiLog = getKodiLog;
