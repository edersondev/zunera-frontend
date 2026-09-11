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

describe('sessionStore registration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('stores name-bearing authenticated session after registration', async () => {
    authService.registerAccount.mockResolvedValue({
      user: { id: 1, name: 'Ana da Silva', email: 'person@example.com' },
      session: { idle_expires_at: 'soon', absolute_expires_at: 'later' },
    })

    const store = useSessionStore()
    await store.register({ name: 'Ana da Silva', email: 'person@example.com', password: 'correct horse battery staple' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual({ id: 1, name: 'Ana da Silva', email: 'person@example.com' })
  })
})
