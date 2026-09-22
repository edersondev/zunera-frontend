import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardStatementPaymentDialog from '../CreditCardStatementPaymentDialog.vue'

vi.mock('@/services/financialAccountService', () => ({ listFinancialAccounts: vi.fn() }))

const { listFinancialAccounts } = await import('@/services/financialAccountService')

const stubs = {
  ElDialog: { props: ['modelValue', 'title'], template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>' },
  ElForm: { template: '<form><slot /></form>', methods: { clearValidate: vi.fn() } },
  ElFormItem: { props: ['label', 'error'], template: '<label><span>{{ label }}</span><slot /><small v-if="error">{{ error }}</small></label>' },
  ElSelect: { props: ['modelValue'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><slot /></select>' },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  CurrencyAmountInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input data-test="amount" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />' },
  ElDatePicker: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  ElInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}</aside>' },
  ElButton: { props: ['loading', 'type'], emits: ['click'], template: '<button :disabled="loading" :data-type="type" @click="$emit(\'click\')"><slot /></button>' },
}

const statement = {
  id: 72,
  status: 'closed',
  due_date: '2026-10-05',
  outstanding_amount: { amount_centavos: 10_000 },
}

function factory(props = {}) {
  return mount(CreditCardStatementPaymentDialog, {
    props: { visible: true, statement, ...props },
    global: { plugins: [i18n], stubs },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  listFinancialAccounts.mockResolvedValue([{ id: 7, name: 'Main account', status: 'active' }])
})

describe('CreditCardStatementPaymentDialog', () => {
  it('shows due date and submits a partial settlement from an active account', async () => {
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.get('[data-test="credit-card-payment-outstanding"]').text()).toContain('05/10/2026')
    await wrapper.find('select').setValue('7')
    await wrapper.get('[data-test="credit-card-payment-amount"]').setValue('3334')
    await wrapper.find('input[type="date"]').setValue('2026-10-05')
    await wrapper.findAll('button').at(-1).trigger('click')

    expect(wrapper.emitted('submit')).toContainEqual([{
      financial_account_id: 7,
      amount_centavos: 3_334,
      payment_date: '2026-10-05',
      notes: null,
    }])
    expect(wrapper.get('[data-test="credit-card-payment-remaining"]').text()).toContain('66,66')
  })

  it('restates editable payment total before saving an account reassignment', async () => {
    const wrapper = factory({
      payment: {
        id: 11,
        amount: { amount_centavos: 3_334 },
        payment_date: '2026-10-05',
        notes: null,
        is_removed: false,
        financial_account: { id: 9, name: 'Archived account', status: 'archived' },
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-test="credit-card-payment-outstanding"]').text()).toContain('133,34')
    expect(listFinancialAccounts).toHaveBeenCalledWith('active')
    expect(wrapper.find('select').text()).toContain('Main account')
    expect(wrapper.find('select').text()).not.toContain('Archived account')
  })

  it('renders account and amount validation feedback', async () => {
    const wrapper = factory({
      mutationError: { errors: { financial_account_id: ['Choose an active owned account.'], amount_centavos: ['Amount exceeds outstanding.'] } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Choose an active owned account.')
    expect(wrapper.text()).toContain('Amount exceeds outstanding.')
  })
})
