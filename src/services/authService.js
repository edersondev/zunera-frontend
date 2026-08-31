import { apiRequest } from './httpClient'

function authPayload(response) {
  return response.data.data
}

export async function registerAccount(payload) {
  return authPayload(
    await apiRequest(
      {
        method: 'post',
        url: '/api/v1/auth/register',
        data: payload,
      },
      { csrf: true },
    ),
  )
}

export async function signIn(payload) {
  return authPayload(
    await apiRequest(
      {
        method: 'post',
        url: '/api/v1/auth/login',
        data: payload,
      },
      { csrf: true },
    ),
  )
}

export async function getSession() {
  return authPayload(
    await apiRequest({
      method: 'get',
      url: '/api/v1/auth/session',
    }),
  )
}

export async function continueSession() {
  const response = await apiRequest(
    {
      method: 'post',
      url: '/api/v1/auth/session/continue',
    },
    { csrf: true },
  )

  return response.data
}

export async function signOut() {
  await apiRequest(
    {
      method: 'delete',
      url: '/api/v1/auth/session',
    },
    { csrf: true },
  )
}

export async function requestPasswordRecovery(payload) {
  const response = await apiRequest(
    {
      method: 'post',
      url: '/api/v1/auth/password/recovery',
      data: payload,
    },
    { csrf: true },
  )

  return response.data
}

export async function resetPassword(payload) {
  const response = await apiRequest(
    {
      method: 'post',
      url: '/api/v1/auth/password/reset',
      data: payload,
    },
    { csrf: true },
  )

  return response.data
}
