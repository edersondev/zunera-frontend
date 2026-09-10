import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryForm from '../CategoryForm.vue'

describe('CategoryForm', () => {
  it('explains the classification lock for used categories', () => {
    const wrapper = mount(CategoryForm, {
      props: {
        category: {
          name: 'Pet care',
          classification: 'expense',
          color: 'teal',
          icon: 'heart',
          has_financial_transactions: true,
        },
      },
      global: {
        stubs: {
          ElForm: { template: '<form><slot /></form>', methods: { validate: () => true } },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: true,
          ElSelect: { template: '<select><slot /></select>' },
          ElOption: true,
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Classification is locked')
  })
})
