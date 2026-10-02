import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    vi.clearAllMocks()
    register.mockResolvedValue(undefined)
    push.mockResolvedValue(undefined)
  })

  it('blocks passwords based on registration details during submission', async () => {
    const validatingForm = {
      props: ['labelPosition', 'model', 'rules'],
      methods: {
        validate() {
          return new Promise((resolve, reject) => {
            this.rules.password[3].validator(null, this.model.password, (error) => {
              if (error) reject(error)
              else resolve(true)
            })
          })
        },
      },
      template: '<form :label-position="labelPosition"><slot /></form>',
    }
    const wrapper = mount(RegisterForm, {
      global: { stubs: { ...stubs, ElForm: validatingForm } },
    })
    wrapper.vm.form.name = 'SilverCloud'
    wrapper.vm.form.email = 'person@example.com'
    wrapper.vm.form.password = 'SilverCloud2026!'
    wrapper.vm.form.password_confirmation = 'SilverCloud2026!'

    await expect(wrapper.vm.submit()).rejects.toThrow()
    expect(register).not.toHaveBeenCalled()

    wrapper.vm.form.name = 'Ana da Silva'
    wrapper.vm.form.password = 'person@example.com2026!'
    wrapper.vm.form.password_confirmation = 'person@example.com2026!'
    await expect(wrapper.vm.submit()).rejects.toThrow()
    expect(register).not.toHaveBeenCalled()

    wrapper.vm.form.password = 'correct horse battery staple'
    wrapper.vm.form.password_confirmation = 'correct horse battery staple'
    await wrapper.vm.submit()
    expect(register).toHaveBeenCalledWith({
      name: 'Ana da Silva',
      email: 'person@example.com',
      password: 'correct horse battery staple',
      password_confirmation: 'correct horse battery staple',
    })
  })

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
