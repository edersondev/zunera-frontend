import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import SignInForm from '../SignInForm.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores/auth/sessionStore', () => ({
  useSessionStore: () => ({
    loading: false,
    login: vi.fn(),
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
    template: '<div role="alert"><slot /></div>',
  },
}

describe('SignInForm', () => {
  it('uses Element Plus top-label form and account links', () => {
    const wrapper = mount(SignInForm, { global: { stubs } })

    expect(wrapper.get('form').attributes('label-position')).toBe('top')
    expect(wrapper.text()).toContain('Email')
    expect(wrapper.text()).toContain('Password')
    expect(wrapper.text()).toContain('Forgot password?')
    expect(wrapper.text()).toContain('Create account')
  })
})
