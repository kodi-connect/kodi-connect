const axios = require('axios');

const { KODI_CONNECT_URL, mongoDb, getLoggedInUserSession } = require('./util');

describe('Devices', () => {
  test('Should add device', async () => {
    const session = await getLoggedInUserSession();

    let resp = await session({
      method: 'GET',
      url: `${KODI_CONNECT_URL}/devices`,
      validateStatus: (status) => status == 200,
    });

    expect(resp.data).not.toContain('Living Room Kodi');

    await session({
      method: 'POST',
      url: `${KODI_CONNECT_URL}/device/add`,
      data: new URLSearchParams({
        name: 'Living Room Kodi',
      }),
      validateStatus: (status) => status == 302,
    });

    resp = await session({
      method: 'GET',
      url: `${KODI_CONNECT_URL}/devices`,
      validateStatus: (status) => status == 200,
    });

    expect(resp.data).toContain('Living Room Kodi');
  });

  afterAll(async () => {
    await (await mongoDb).close();
  });
})