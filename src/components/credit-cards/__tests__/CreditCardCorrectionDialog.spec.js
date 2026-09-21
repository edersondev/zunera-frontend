import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardCorrectionDialog from '../CreditCardCorrectionDialog.vue'

vi.mock('@/services/categoryService', () => ({ listCategories: vi.fn() }))

const { listCategories } = await import('@/services/categoryService')
const stubs = {
  ElDialog: { props: ['modelValue', 'title'], template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><slot name="footer" /></section>' },
  ElForm: { template: '<form><slot /></form>', methods: { clearValidate: vi.fn() } },
  ElFormItem: { props: ['label', 'error'], template: '<label>{{ label }}<slot /><small v-if="error">{{ error }}</small></label>' },
  ElSelect: { props: ['modelValue'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><slot /></select>' },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  CurrencyAmountInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input data-test="amount" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />' },
  ElDatePicker: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  ElInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  ElInputNumber: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />' },
  ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}</aside>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

const purchase = {
  id: 301,
  category: { id: 18 },
  description: 'Groceries',
  purchase_date: '2026-09-05',
  total_amount: { amount_centavos: 10_000 },
  installment_count: 1,
}

function factory(props = {}) {
  return mount(CreditCardCorrectionDialog, {
    props: { visible: true, purchase, ...props },
    global: { plugins: [i18n], stubs },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  listCategories.mockResolvedValue([
    { id: 18, name: 'Groceries', classification: 'expense', status: 'active' },
    { id: 19, name: 'Salary', classification: 'income', status: 'active' },
  ])
})

describe('CreditCardCorrectionDialog', () => {
  it('submits an editable pre-close correction with only active expense categories', async () => {
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.find('select').text()).toContain('Groceries')
    expect(wrapper.find('select').text()).not.toContain('Salary')
    await wrapper.get('[data-test="credit-card-correction-amount"]').setValue('8000')
    await wrapper.find('input[type="date"]').setValue('2026-09-06')
    await wrapper.find('input[type="number"]').setValue('2')
    await wrapper.findAll('button').at(-1).trigger('click')

    expect(wrapper.emitted('submit')).toContainEqual([{
      category_id: 18,
      description: 'Groceries',
      purchase_date: '2026-09-06',
      total_amount_centavos: 8_000,
      installment_count: 2,
    }])
  })

  it('shows the server invalid-state explanation after closing', () => {
    const wrapper = factory({ mutationError: { message: 'A closed installment requires a credit event.' } })

    expect(wrapper.get('[role="alert"]').text()).toContain('closed installment')
  })
})
