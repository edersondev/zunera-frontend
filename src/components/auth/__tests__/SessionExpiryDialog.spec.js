import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SessionExpiryDialog from '../SessionExpiryDialog.vue'

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
    logout: vi.fn(),
  }),
}))

describe('SessionExpiryDialog', () => {
  it('shows warning actions when idle expiry is near', () => {
    const wrapper = mount(SessionExpiryDialog, {
      global: {
        stubs: {
          ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.text()).toContain('45 seconds')
    expect(wrapper.text()).toContain('Sign out')
    expect(wrapper.text()).toContain('Continue session')
  })
})
