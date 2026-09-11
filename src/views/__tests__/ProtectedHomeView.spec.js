import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProtectedHomeView from '../ProtectedHomeView.vue'

const push = vi.fn()
const logout = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/stores/auth/sessionStore', () => ({
  useSessionStore: () => ({
    user: { email: 'person@example.com' },
    session: {
      idle_expires_at: '2026-09-01T12:15:00Z',
      absolute_expires_at: '2026-09-01T20:00:00Z',
    },
    loading: false,
    logout,
  }),
}))

const stubs = {
  RouterLink: {
    template: '<a><slot /></a>',
  },
  ElButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
}

describe('ProtectedHomeView', () => {
  it('redirects to sign in after sign out', async () => {
    const wrapper = mount(ProtectedHomeView, { global: { stubs } })

    await wrapper.get('button').trigger('click')

    expect(logout).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith({ name: 'sign-in' })
  })

  it('links to the financial accounts workspace', () => {
    const wrapper = mount(ProtectedHomeView, { global: { stubs } })

    expect(wrapper.text()).toContain('Abrir contas financeiras')
  })
})
