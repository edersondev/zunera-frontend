import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import AuthLayout from '../AuthLayout.vue'

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
})
