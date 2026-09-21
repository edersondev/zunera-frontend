import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardCreditEventDialog from '../CreditCardCreditEventDialog.vue'

const stubs = {
  ElDialog: { props: ['modelValue', 'title'], template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><slot name="footer" /></section>' },
  ElForm: { template: '<form><slot /></form>', methods: { clearValidate: () => {} } },
  ElFormItem: { props: ['label', 'error'], template: '<label>{{ label }}<slot /><small v-if="error">{{ error }}</small></label>' },
  ElSelect: { props: ['modelValue'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>' },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  CurrencyAmountInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input data-test="amount" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />' },
  ElDatePicker: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  ElInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}</aside>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
}

const purchase = {
  id: 301,
  total_amount: { amount_centavos: 10_000 },
  credit_events: [{ id: 1, amount: { amount_centavos: 2_500 } }],
}

function factory(props = {}) {
  return mount(CreditCardCreditEventDialog, {
    props: { visible: true, purchase, ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('CreditCardCreditEventDialog', () => {
  it('explains remaining card credit and submits a post-closing cancellation event', async () => {
    const wrapper = factory()

    expect(wrapper.get('[data-test="credit-card-credit-event-limit"]').text()).toContain('75,00')
    await wrapper.find('select').setValue('cancellation')
    await wrapper.get('[data-test="credit-card-credit-event-amount"]').setValue('7500')
    await wrapper.find('input[type="date"]').setValue('2026-10-05')
    await wrapper.findAll('button').at(-1).trigger('click')

    expect(wrapper.emitted('submit')).toContainEqual([{
      reason: 'cancellation',
      amount_centavos: 7_500,
      event_date: '2026-10-05',
      notes: null,
    }])
  })

  it('keeps typed refund validation visible instead of silently applying credit', () => {
    const wrapper = factory({ mutationError: { errors: { amount_centavos: ['Amount exceeds the uncredited purchase value.'] } } })

    expect(wrapper.text()).toContain('Amount exceeds the uncredited purchase value.')
  })
})
