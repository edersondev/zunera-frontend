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

  it('keeps the visitor signed out after registration', async () => {
    authService.registerAccount.mockResolvedValue({
      message: 'Check your email.',
      activation_required: true,
    })

    const store = useSessionStore()
    await expect(store.register({ name: 'Ana da Silva', email: 'person@example.com', password: 'correct horse battery staple' }))
      .resolves.toEqual({ message: 'Check your email.', activation_required: true })

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })
})
