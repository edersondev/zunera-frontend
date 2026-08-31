import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  apiRequest: vi.fn(),
}))

const { apiRequest } = await import('../httpClient')
const { registerAccount } = await import('../authService')

describe('authService registration', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('posts registration through CSRF protected transport', async () => {
    apiRequest.mockResolvedValue({
      data: {
        data: {
          user: { id: 1, email: 'person@example.com' },
          session: { idle_expires_at: '2026-08-30T10:00:00Z', absolute_expires_at: '2026-08-30T18:00:00Z' },
        },
      },
    })

    const payload = {
      email: 'person@example.com',
      password: 'correct horse battery staple',
      password_confirmation: 'correct horse battery staple',
    }

    await expect(registerAccount(payload)).resolves.toEqual({
      user: { id: 1, email: 'person@example.com' },
      session: { idle_expires_at: '2026-08-30T10:00:00Z', absolute_expires_at: '2026-08-30T18:00:00Z' },
    })
    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'post',
        url: '/api/v1/auth/register',
        data: payload,
      },
      { csrf: true },
    )
  })
})
