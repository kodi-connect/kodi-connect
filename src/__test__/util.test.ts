import { parseAuthorizationHeader } from '../util/api'

function createReqWithAuthorization(username, password) {
  const usernamePassword = `${username}:${password}`
  const authorizationHeader = `Basic ${Buffer.from(usernamePassword).toString('base64')}`
  return { headers: { authorization: authorizationHeader } }
}

test('Test authorization header parsing', () => {
  const usernamePasswordPairs = [
    ['test', 'test'],
    ['somename@somedomain.net', 'NoOneWillGuessThisWithspecial***$@'],
  ]

  for (const [inUsername, inPassword] of usernamePasswordPairs) {
    const { username, secret } = parseAuthorizationHeader(
      createReqWithAuthorization(inUsername, inPassword)
    )
    expect(username).toEqual(inUsername)
    expect(secret).toEqual(inPassword)
  }
})
