import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))

const { apiRequest } = await import('../httpClient')
const { updateProfileName, changeCurrentPassword } = await import('../authService')

describe('authService profile', () => {
  beforeEach(() => apiRequest.mockReset())

  it('sends only name and uses the protected profile contract', async () => {
    const user = { id: 7, name: 'New Name', email: 'person@example.com' }
    apiRequest.mockResolvedValue({ data: { data: user } })

    await expect(updateProfileName('New Name')).resolves.toEqual(user)
    expect(apiRequest).toHaveBeenCalledWith(
      { method: 'patch', url: '/api/v1/auth/profile', data: { name: 'New Name' } },
      { csrf: true },
    )
  })

  it('sends current and confirmed new password without expecting profile data', async () => {
    apiRequest.mockResolvedValue({ data: null })
    const payload = {
      current_password: 'old correct battery staple',
      password: 'new correct battery staple',
      password_confirmation: 'new correct battery staple',
    }

    await changeCurrentPassword(payload)
    expect(apiRequest).toHaveBeenCalledWith(
      { method: 'patch', url: '/api/v1/auth/password', data: payload },
      { csrf: true },
    )
  })
})
