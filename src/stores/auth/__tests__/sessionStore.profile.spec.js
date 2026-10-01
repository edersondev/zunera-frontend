import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/authService', () => ({
  getSession: vi.fn(),
  registerAccount: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  continueSession: vi.fn(),
  requestPasswordRecovery: vi.fn(),
  resetPassword: vi.fn(),
  updateProfileName: vi.fn(),
  changeCurrentPassword: vi.fn(),
}))

const authService = await import('@/services/authService')
const { useSessionStore } = await import('../sessionStore')

describe('sessionStore profile', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('updates header identity from the returned user and keeps session', async () => {
    const store = useSessionStore()
    store.user = { id: 7, name: 'Old Name', email: 'person@example.com' }
    store.session = { idle_expires_at: 'later' }
    authService.updateProfileName.mockResolvedValue({ id: 7, name: 'New Name', email: 'person@example.com' })

    await store.updateProfileName('New Name')

    expect(store.user.name).toBe('New Name')
    expect(store.user.email).toBe('person@example.com')
    expect(store.session).toEqual({ idle_expires_at: 'later' })
  })

  it('preserves current session after password change', async () => {
    const store = useSessionStore()
    store.user = { id: 7, name: 'Person', email: 'person@example.com' }
    store.session = { idle_expires_at: 'later' }
    const payload = { current_password: 'old', password: 'new', password_confirmation: 'new' }

    await store.changeCurrentPassword(payload)

    expect(authService.changeCurrentPassword).toHaveBeenCalledWith(payload)
    expect(store.user.id).toBe(7)
    expect(store.session).toEqual({ idle_expires_at: 'later' })
  })
})
