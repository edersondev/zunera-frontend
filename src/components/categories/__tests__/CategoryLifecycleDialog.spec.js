import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryLifecycleDialog from '../CategoryLifecycleDialog.vue'

describe('CategoryLifecycleDialog', () => {
  it('confirms archiving without a permanent delete action', () => {
    const wrapper = mount(CategoryLifecycleDialog, {
      props: { visible: true, category: { name: 'Pet care' }, action: 'archive' },
      global: {
        stubs: {
          ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
          ElButton: {
            props: ['type'],
            template: '<button :data-button-type="type"><slot /></button>',
          },
        },
      },
    })
    expect(wrapper.text()).toContain('past history stays intact')
    expect(wrapper.text()).not.toContain('Delete')
    expect(wrapper.find('button').attributes('data-button-type')).toBe('danger')
  })

  it('renders restore cancellation as dangerous', () => {
    const wrapper = mount(CategoryLifecycleDialog, {
      props: { visible: true, category: { name: 'Pet care' }, action: 'restore' },
      global: {
        stubs: {
          ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
          ElButton: {
            props: ['type'],
            template: '<button :data-button-type="type"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.find('button').attributes('data-button-type')).toBe('danger')
  })
})
