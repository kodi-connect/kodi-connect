const axios = require('axios');
const adapter = require('axios/lib/adapters/http');

const { KODI_CONNECT_URL, mongoDb, getRandomAlphanum, createUser, getLoggedInUserSession } = require('./util');

describe('Auth', () => {
  test('Password oauth should not be enabled', async () => {
    const p = axios({
      adapter,
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

    await expect(p).rejects.toEqual(new Error('Request failed with status code 400'))
  });

  test('Register user', async () => {
    const email = `test.${getRandomAlphanum()}@email.com`;
    const password = 'test';

    console.log(`Email: ${email}`);

    await axios({
      adapter,
      method: 'POST',
      url: `${KODI_CONNECT_URL}/register`,
      data: new URLSearchParams({
        email,
        password,
        repeatPassword: password,
      }),
    });

    const { confirmationToken } = await (await mongoDb).db('kodi').collection('Users').findOne({ username: email });

    await axios({
      adapter,
      method: 'GET',
      url: `${KODI_CONNECT_URL}/confirm/${confirmationToken}`,
    });

    const session = await getLoggedInUserSession({ username: email, password });

    await session({
      adapter,
      method: 'GET',
      url: `${KODI_CONNECT_URL}/devices`,
      validateStatus: (status) => status == 200,
    });
  });

  test('Should fail on different passwords', async () => {
    const email = `test.${getRandomAlphanum()}@email.com`;
    const password = 'test';
    const repeatPassword = `${password}1`;

    console.log(`Email: ${email}`);

    const p = axios({
      adapter,
      method: 'POST',
      url: `${KODI_CONNECT_URL}/register`,
      data: new URLSearchParams({
        email,
        password,
        repeatPassword,
      }),
      maxRedirects: 0,
    });
    await expect(p).rejects.toEqual(new Error('Request failed with status code 302'));
  });

  test('Should fail same email', async () => {
    const { username, password } = await createUser();

    console.log(`Email: ${username}`);

    const p = axios({
      adapter,
      method: 'POST',
      url: `${KODI_CONNECT_URL}/register`,
      data: new URLSearchParams({
        email: username,
        password,
        repeatPassword: password,
      }),
      maxRedirects: 0,
    });
    await expect(p).rejects.toEqual(new Error('Request failed with status code 302'));
  });

  afterAll(async () => {
    await (await mongoDb).close();
  });
})