import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import RecoveryRequestForm from '../RecoveryRequestForm.vue'
import ResetPasswordForm from '../ResetPasswordForm.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores/auth/sessionStore', () => ({
  useSessionStore: () => ({
    loading: false,
    requestPasswordRecovery: vi.fn(),
    resetPassword: vi.fn(),
  }),
}))

const stubs = {
  RouterLink: RouterLinkStub,
  ElForm: {
    props: ['labelPosition'],
    methods: {
      validate: () => Promise.resolve(true),
    },
    template: '<form :label-position="labelPosition"><slot /></form>',
  },
  ElFormItem: {
    props: ['label'],
    template: '<label><span>{{ label }}</span><slot /></label>',
  },
  ElInput: {
    props: ['modelValue'],
    template: '<input :value="modelValue" />',
  },
  ElButton: {
    template: '<button><slot /></button>',
  },
  ElAlert: {
    props: ['title', 'description'],
    template: '<div role="alert">{{ title }} {{ description }}<slot /></div>',
  },
}

describe('Recovery and reset forms', () => {
  it('uses top-label form for recovery request', () => {
    const wrapper = mount(RecoveryRequestForm, { global: { stubs } })

    expect(wrapper.get('form').attributes('label-position')).toBe('top')
    expect(wrapper.text()).toContain('Email')
  })

  it('uses top-label form and stable reset states for reset', () => {
    const wrapper = mount(ResetPasswordForm, {
      props: { email: 'person@example.com', token: 'token' },
      global: { stubs },
    })

    expect(wrapper.get('form').attributes('label-position')).toBe('top')
    expect(wrapper.text()).toContain('Recovery token')
    expect(wrapper.text()).toContain('New password')
    expect(wrapper.text()).toContain('Confirm new password')
  })
})
