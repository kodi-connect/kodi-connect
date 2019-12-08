const { MongoClient } = require('mongodb');
const axios = require('axios');
const bcrypt = require('bcryptjs');

const KODI_CONNECT_URL = process.env.KODI_CONNECT_URL || null;
const MONGO_URL = process.env.MONGO_URL || null;

const mongoDb = MongoClient.connect(MONGO_URL);

function getRandomAlphanum() {
  return Math.random().toString(36).slice(2);
}

async function createUser() {
  const username = `mock.${getRandomAlphanum()}@email.com`;
  const password = 'test';

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    username,
    password: hashedPassword,
    createdAt: new Date(),
    activated: true,
  };

  await (await mongoDb)
    .db('kodi')
    .collection('Users')
    .insertOne(newUser);
  
  return { username, password };
}

async function getLoggedInUserSession(credentials) {
  const { username, password } = credentials || await createUser();
  if (!username || !password) throw new Error('Missing username/password');

  const resp = await axios({
    method: 'POST',
    url: `${KODI_CONNECT_URL}/login`,
    data: new URLSearchParams({
      email: username,
      password,
    }),
    maxRedirects: 0,
    validateStatus: (status) => status == 302,
  });
  const cookie = resp.headers["set-cookie"][0];

  const axiosInstance = axios.create({ baseURL: KODI_CONNECT_URL });
  axiosInstance.defaults.headers.Cookie = cookie;
  axiosInstance.defaults.maxRedirects = 0;

  return axiosInstance;
}

exports.KODI_CONNECT_URL = KODI_CONNECT_URL;
exports.mongoDb = mongoDb;
exports.getRandomAlphanum = getRandomAlphanum;
exports.createUser = createUser;
exports.getLoggedInUserSession = getLoggedInUserSession;
