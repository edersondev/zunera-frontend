import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import BudgetPlanFormDialog from '../BudgetPlanFormDialog.vue'

let validationFails = false

const ElForm = defineComponent({
  name: 'ElForm',
  setup(_, { slots }) {
    return {
      validate: () =>
        validationFails ? Promise.reject(new Error('invalid')) : Promise.resolve(true),
      slots,
    }
  },
  template: '<form><slot /></form>',
})

const stubs = {
  ElDialog: {
    name: 'ElDialog',
    props: ['modelValue', 'title'],
    template: '<section role="dialog"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
  },
  ElForm,
  ElFormItem: {
    name: 'ElFormItem',
    props: ['label', 'error'],
    template: '<label><span>{{ label }}</span><slot /><em class="error">{{ error }}</em></label>',
  },
  ElSelect: defineComponent({
    name: 'ElSelect',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value === \'\' ? null : Number($event.target.value))"><slot /></select>',
  }),
  ElOption: defineComponent({
    name: 'ElOption',
    props: ['value', 'label'],
    template: '<option :value="value">{{ label }}</option>',
  }),
  ElButton: {
    name: 'ElButton',
    props: ['disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  CurrencyAmountInput: defineComponent({
    name: 'CurrencyAmountInput',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input data-test="amount-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value === \'\' ? null : Number($event.target.value))" />',
  }),
}

const categories = [
  { id: 3, name: 'Mercado', classification: 'expense', status: 'active' },
  { id: 5, name: 'Transporte', classification: 'expense', status: 'active' },
]

function mountDialog(props = {}) {
  return mount(BudgetPlanFormDialog, {
    props: { modelValue: true, categories, ...props },
    global: { stubs },
  })
}

describe('BudgetPlanFormDialog', () => {
  it('blocks submission until an expense category and a positive amount are provided', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-test="budget-plan-submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeUndefined()

    await wrapper.get('select').setValue('3')
    await wrapper.get('[data-test="amount-input"]').setValue('1000')
    await wrapper.get('[data-test="budget-plan-submit"]').trigger('click')

    expect(wrapper.emitted('submit')[0][0]).toEqual({
      category_id: 3,
      planned_amount_centavos: 1000,
    })
  })

  it('shows server field errors for money input without closing the dialog', () => {
    const wrapper = mountDialog({
      fieldErrors: { planned_amount_centavos: ['Informe um valor entre R$ 0,01 e R$ 999.999.999,99.'] },
    })

    expect(wrapper.text()).toContain('Informe um valor entre')
  })

  it('ignores a second submission while the first one is still in flight', async () => {
    const wrapper = mountDialog({ submitting: true })

    await wrapper.get('[data-test="budget-plan-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('does not emit when form validation fails', async () => {
    validationFails = true
    const wrapper = mountDialog()

    await wrapper.get('select').setValue('3')
    await wrapper.get('[data-test="amount-input"]').setValue('1000')
    await wrapper.get('[data-test="budget-plan-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    validationFails = false
  })

  it('prefills the edited plan and resets the form when the dialog closes', async () => {
    const wrapper = mountDialog({
      plan: {
        id: 11,
        category: { id: 3, name: 'Mercado', status: 'active' },
        planned: { amount_centavos: 100_000, currency_code: 'BRL' },
      },
    })

    expect(wrapper.get('select').element.value).toBe('3')
    expect(wrapper.get('[data-test="amount-input"]').element.value).toBe('100000')

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true, plan: null })

    expect(wrapper.get('[data-test="amount-input"]').element.value).toBe('')
  })
})
