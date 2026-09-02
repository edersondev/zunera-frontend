import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  apiRequest: vi.fn(),
}))

const { apiRequest } = await import('../httpClient')
const { requestPasswordRecovery, resetPassword } = await import('../authService')

describe('authService recovery', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('requests recovery and reset through CSRF protected transport', async () => {
    apiRequest.mockResolvedValueOnce({ data: { message: 'neutral' } })
    apiRequest.mockResolvedValueOnce({ data: { message: 'changed' } })

    await expect(requestPasswordRecovery({ email: 'person@example.com' })).resolves.toEqual({ message: 'neutral' })
    await expect(resetPassword({ email: 'person@example.com', token: 'token', password: 'new password value' })).resolves.toEqual({
      message: 'changed',
    })

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      { method: 'post', url: '/api/v1/auth/password/recovery', data: { email: 'person@example.com' } },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      { method: 'post', url: '/api/v1/auth/password/reset', data: { email: 'person@example.com', token: 'token', password: 'new password value' } },
      { csrf: true },
    )
  })
})
