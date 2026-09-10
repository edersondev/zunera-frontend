import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryList from '../CategoryList.vue'

describe('CategoryList', () => {
  it('marks defaults textually and does not offer their mutation controls', () => {
    const wrapper = mount(CategoryList, {
      props: {
        categories: [
          {
            id: 1,
            name: 'Food',
            origin: 'system',
            classification: 'expense',
            color: 'amber',
            icon: 'utensils',
          },
        ],
      },
      global: {
        stubs: {
          ElEmpty: { template: '<div><slot /></div>' },
          ElTag: { template: '<span><slot /></span>' },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })
    expect(wrapper.text()).toContain('System default')
    expect(wrapper.text()).toContain('Expense')
    expect(wrapper.text()).not.toContain('Archive')
  })
})
