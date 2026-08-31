import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  apiRequest: vi.fn(),
}))

const { apiRequest } = await import('../httpClient')
const { continueSession, getSession, signIn, signOut } = await import('../authService')

describe('authService session', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('maps login and session payloads from the verified contract', async () => {
    apiRequest.mockResolvedValue({ data: { data: { user: { id: 1, email: 'person@example.com' }, session: {} } } })

    await expect(signIn({ email: 'person@example.com', password: 'secret' })).resolves.toEqual({
      user: { id: 1, email: 'person@example.com' },
      session: {},
    })
    await getSession()

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      { method: 'post', url: '/api/v1/auth/login', data: { email: 'person@example.com', password: 'secret' } },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(2, { method: 'get', url: '/api/v1/auth/session' })
  })

  it('uses CSRF protected continuation and logout', async () => {
    apiRequest.mockResolvedValue({ data: { idle_expires_at: 'later', absolute_expires_at: 'much later' } })

    await continueSession()
    await signOut()

    expect(apiRequest).toHaveBeenNthCalledWith(1, { method: 'post', url: '/api/v1/auth/session/continue' }, { csrf: true })
    expect(apiRequest).toHaveBeenNthCalledWith(2, { method: 'delete', url: '/api/v1/auth/session' }, { csrf: true })
  })
})
