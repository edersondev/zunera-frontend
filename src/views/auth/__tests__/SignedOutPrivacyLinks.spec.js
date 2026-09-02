import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import AuthLayout from '@/layouts/AuthLayout.vue'

describe('Signed-out privacy links', () => {
  it('renders privacy and privacy-rights links', () => {
    const wrapper = mount(AuthLayout, {
      props: { title: 'Auth', subtitle: 'Subtitle' },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Privacy notice')
    expect(wrapper.text()).toContain('Privacy rights')
  })
})
