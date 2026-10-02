import { describe, expect, it, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import RegisterForm from '../RegisterForm.vue'

const push = vi.fn()
const register = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/stores/auth/sessionStore', () => ({
  useSessionStore: () => ({
    loading: false,
    register,
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
    props: ['label', 'prop', 'error'],
    template: '<label><span>{{ label }}</span><slot /></label>',
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElButton: {
    template: '<button><slot /></button>',
  },
  ElAlert: {
    template: '<div role="alert"><slot /></div>',
  },
}

describe('RegisterForm', () => {
  it('rejects a weak password and accepts a strong one in form validation', () => {
    const wrapper = mount(RegisterForm, { global: { stubs } })
    const validateStrength = wrapper.vm.rules.password[3].validator
    const weak = vi.fn()
    validateStrength(null, 'qwerty12345', weak)
    expect(weak).toHaveBeenCalledWith(expect.any(Error))

    const strong = vi.fn()
    validateStrength(null, 'correct horse battery staple', strong)
    expect(strong).toHaveBeenCalledWith(undefined)
  })

  it('uses Element Plus top-label form and privacy-ready fields', () => {
    const wrapper = mount(RegisterForm, { global: { stubs } })

    expect(wrapper.get('form').attributes('label-position')).toBe('top')
    expect(wrapper.text()).toContain('E-mail')
    expect(wrapper.text()).toContain('Senha')
    expect(wrapper.text()).toContain('Confirme a senha')
    expect(wrapper.text()).toContain('Use de 8 a 64 caracteres')
  })
})
