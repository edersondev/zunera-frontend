import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import ActivationPanel from '../ActivationPanel.vue'
import ResendActivationForm from '../ResendActivationForm.vue'

const { confirmAccountActivation, resendAccountActivation, replace } = vi.hoisted(() => ({
  confirmAccountActivation: vi.fn(),
  resendAccountActivation: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/services/authService', () => ({ confirmAccountActivation, resendAccountActivation }))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))

const stubs = {
  RouterLink: RouterLinkStub,
  ElAlert: { props: ['title'], template: '<div role="alert">{{ title }}</div>' },
  ElButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElForm: {
    methods: { validate: () => Promise.resolve(true) },
    template: '<form><slot /></form>',
  },
  ElFormItem: { props: ['label'], template: '<label>{{ label }}<slot /></label>' },
  ElInput: { props: ['modelValue'], template: '<input :value="modelValue" />' },
}

describe('account activation UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    replace.mockResolvedValue(undefined)
    confirmAccountActivation.mockResolvedValue({ message: 'Active.' })
    resendAccountActivation.mockResolvedValue({ message: 'Sent.' })
  })

  it('clears the token URL and shows sign-in after activation', async () => {
    const token = 'a'.repeat(64)
    const wrapper = mount(ActivationPanel, {
      props: { email: 'person@example.com', token },
      global: { stubs: { ...stubs, ResendActivationForm: true } },
    })
    await flushPromises()

    expect(replace).toHaveBeenCalledWith({ name: 'activate-account', query: { email: 'person@example.com' } })
    expect(confirmAccountActivation).toHaveBeenCalledWith({ email: 'person@example.com', token })
    expect(wrapper.text()).toContain('Sua conta está ativa')
    expect(wrapper.text()).toContain('Voltar para entrar')
  })

  it('offers resend for an expired link', async () => {
    confirmAccountActivation.mockRejectedValue({ code: 'activation_link_expired', status: 422 })
    const wrapper = mount(ActivationPanel, {
      props: { email: 'person@example.com', token: 'a'.repeat(64) },
      global: { stubs: { ...stubs, ResendActivationForm: { template: '<div>resend form</div>' } } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Este link expirou')
    expect(wrapper.text()).toContain('resend form')
  })

  it('resends with neutral confirmation', async () => {
    const wrapper = mount(ResendActivationForm, {
      props: { initialEmail: 'person@example.com' },
      global: { stubs },
    })

    await wrapper.vm.submit()
    expect(resendAccountActivation).toHaveBeenCalledWith({ email: 'person@example.com' })
    expect(wrapper.text()).toContain('Se existir uma conta inativa')
  })
})
