import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SessionExpiryDialog from '../SessionExpiryDialog.vue'

const push = vi.fn()
const logout = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/composables/useSessionExpiry', () => ({
  useSessionExpiry: () => ({
    showWarning: { value: true },
    secondsUntilIdleExpiry: { value: 45 },
  }),
}))

vi.mock('@/stores/auth/sessionStore', () => ({
  useSessionStore: () => ({
    loading: false,
    continueCurrentSession: vi.fn(),
    logout,
  }),
}))

describe('SessionExpiryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows warning actions when idle expiry is near', () => {
    const wrapper = mount(SessionExpiryDialog, {
      global: {
        stubs: {
          ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.text()).toContain('45 segundos')
    expect(wrapper.text()).toContain('Sair')
    expect(wrapper.text()).toContain('Continuar sessão')
  })

  it('redirects to sign in after sign out', async () => {
    const wrapper = mount(SessionExpiryDialog, {
      global: {
        stubs: {
          ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.findAll('button')[0].trigger('click')

    expect(logout).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith({ name: 'sign-in' })
  })
})
