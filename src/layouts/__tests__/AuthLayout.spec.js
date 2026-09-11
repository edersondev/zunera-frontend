import { afterEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import AuthLayout from '../AuthLayout.vue'
import { i18n } from '@/i18n'

afterEach(() => {
  i18n.global.locale.value = 'pt-BR'
  window.localStorage.clear()
})

describe('AuthLayout', () => {
  it('renders title, signed-out content, and privacy links before form slot', () => {
    const wrapper = mount(AuthLayout, {
      props: {
        title: 'Sign in',
        subtitle: 'Access your account.',
      },
      slots: {
        default: '<form aria-label="Auth form"></form>',
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    expect(wrapper.get('h1').text()).toBe('Sign in')
    expect(wrapper.text()).toContain('Aviso de privacidade')
    expect(wrapper.text()).toContain('Direitos de privacidade')
    expect(wrapper.html().indexOf('Aviso de privacidade')).toBeLessThan(wrapper.html().indexOf('Auth form'))
  })

  it('switches and persists signed-out language selection', async () => {
    const wrapper = mount(AuthLayout, {
      props: { title: 'Entrar', subtitle: 'Acesse sua conta.' },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    await wrapper.get('#auth-language').setValue('en')

    expect(i18n.global.locale.value).toBe('en')
    expect(window.localStorage.getItem('zunera.locale')).toBe('en')
    expect(wrapper.text()).toContain('Language')
  })
})
