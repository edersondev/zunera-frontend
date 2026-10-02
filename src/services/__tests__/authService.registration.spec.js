import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  apiRequest: vi.fn(),
}))

const { apiRequest } = await import('../httpClient')
const { registerAccount, confirmAccountActivation, resendAccountActivation } = await import('../authService')

describe('authService registration', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('posts registration through CSRF protected transport', async () => {
    apiRequest.mockResolvedValue({
      data: {
        message: 'Check your email.',
        activation_required: true,
      },
    })

    const payload = {
      email: 'person@example.com',
      password: 'correct horse battery staple',
      password_confirmation: 'correct horse battery staple',
    }

    await expect(registerAccount(payload)).resolves.toEqual({
      message: 'Check your email.',
      activation_required: true,
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

  it('posts activation and resend through CSRF protected transport', async () => {
    apiRequest.mockResolvedValue({ data: { message: 'Done.' } })

    await confirmAccountActivation({ email: 'person@example.com', token: 'a'.repeat(64) })
    await resendAccountActivation({ email: 'person@example.com' })

    expect(apiRequest).toHaveBeenNthCalledWith(1,
      { method: 'post', url: '/api/v1/auth/activation/confirm', data: { email: 'person@example.com', token: 'a'.repeat(64) } },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(2,
      { method: 'post', url: '/api/v1/auth/activation/resend', data: { email: 'person@example.com' } },
      { csrf: true },
    )
  })
})
