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
}))

const authService = await import('@/services/authService')
const { useSessionStore } = await import('../sessionStore')

describe('sessionStore session', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('bootstraps authenticated state once and clears on logout', async () => {
    authService.getSession.mockResolvedValue({
      user: { id: 1, email: 'person@example.com' },
      session: { idle_expires_at: 'soon', absolute_expires_at: 'later' },
    })
    authService.signOut.mockResolvedValue()

    const store = useSessionStore()
    await store.bootstrap()
    await store.bootstrap()

    expect(authService.getSession).toHaveBeenCalledTimes(1)
    expect(store.isAuthenticated).toBe(true)

    await store.logout()
    expect(store.isAuthenticated).toBe(false)
  })

  it('updates authoritative expiry on continuation', async () => {
    authService.continueSession.mockResolvedValue({ idle_expires_at: 'later', absolute_expires_at: 'absolute' })

    const store = useSessionStore()
    await store.continueCurrentSession()

    expect(store.session).toEqual({ idle_expires_at: 'later', absolute_expires_at: 'absolute' })
  })
})
