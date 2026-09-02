import { describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores/auth/sessionStore', () => ({
  useSessionStore: () => ({
    isAuthenticated: false,
    clearSession: vi.fn(),
  }),
}))

describe('App', () => {
  it('mounts the auth route outlet', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: { template: '<main><h1>Sign in</h1></main>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Sign in')
  })
})
