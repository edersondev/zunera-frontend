import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryForm from '../CategoryForm.vue'

describe('CategoryForm', () => {
  it('keeps create values until its parent confirms success', async () => {
    const wrapper = mount(CategoryForm, {
      global: {
        stubs: {
          ElForm: {
            template: '<form @submit="$emit(\'submit\', $event)"><slot /></form>',
            methods: { validate: () => Promise.resolve(true) },
          },
          ElFormItem: { template: '<div><slot /></div>' },
          ElInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          ElSelect: { template: '<select><slot /></select>' },
          ElOption: true,
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })

    await wrapper.find('input').setValue('  Pet care ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toContainEqual([
      { name: 'Pet care', classification: 'expense', color: 'teal', icon: 'circle' },
    ])
    expect(wrapper.find('input').element.value).toBe('  Pet care ')
  })

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
