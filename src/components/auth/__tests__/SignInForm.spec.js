import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import SignInForm from '../SignInForm.vue'

const { login } = vi.hoisted(() => ({ login: vi.fn() }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores/auth/sessionStore', () => ({
  useSessionStore: () => ({
    loading: false,
    login,
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
    props: ['title'],
    template: '<div role="alert">{{ title }}</div>',
  },
}

describe('SignInForm', () => {
  it('uses Element Plus top-label form and account links', () => {
    const wrapper = mount(SignInForm, { global: { stubs } })

    expect(wrapper.get('form').attributes('label-position')).toBe('top')
    expect(wrapper.text()).toContain('E-mail')
    expect(wrapper.text()).toContain('Senha')
    expect(wrapper.text()).toContain('Esqueceu sua senha?')
    expect(wrapper.text()).toContain('Criar conta')
    expect(wrapper.text()).toContain('Reenviar link de ativação')
  })

  it('shows activation guidance for an inactive account response', async () => {
    login.mockRejectedValueOnce({ code: 'account_inactive', status: 403 })
    const wrapper = mount(SignInForm, { global: { stubs } })
    wrapper.vm.form.email = 'person@example.com'
    wrapper.vm.form.password = 'correct horse battery staple'
    await wrapper.vm.submit()

    expect(wrapper.text()).toContain('Sua conta está inativa')
    expect(wrapper.text()).toContain('Reenviar link de ativação')
  })
})
