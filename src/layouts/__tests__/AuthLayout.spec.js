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
    expect(wrapper.text()).toContain('Privacy notice')
    expect(wrapper.text()).toContain('Privacy rights')
    expect(wrapper.html().indexOf('Privacy notice')).toBeLessThan(wrapper.html().indexOf('Auth form'))
  })
})
