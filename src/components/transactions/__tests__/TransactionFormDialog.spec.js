import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionFormDialog from '../TransactionFormDialog.vue'
import { i18n } from '@/i18n'

const stubs = {
  ElDialog: {
    props: ['modelValue', 'title'],
    template:
      '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>',
  },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: {
    props: ['label', 'error'],
    template: '<label><span>{{ label }}</span><slot /><small v-if="error">{{ error }}</small></label>',
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElInputNumber: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElDatePicker: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElButton: {
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
}

const archivedTransaction = {
  id: 5,
  type: 'expense',
  status: 'effective',
  description: 'Conta antiga',
  notes: 'Nota histórica',
  amount_centavos: 1999,
  transaction_date: '2026-08-01',
  financial_account: { id: 9, name: 'Conta encerrada', status: 'archived' },
  category: { id: 7, name: 'Contas antigas', status: 'archived', classification: 'expense' },
}

describe('TransactionFormDialog', () => {
  it('prefills every editable field and keeps an archived association selectable', async () => {
    const wrapper = mount(TransactionFormDialog, {
      props: {
        modelValue: true,
        transaction: archivedTransaction,
        accounts: [{ id: 1, name: 'Conta principal', status: 'active' }],
        categories: [{ id: 2, name: 'Alimentação', status: 'active', classification: 'expense' }],
      },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.get('[data-test="transaction-account"]').text()).toContain(
      'Conta encerrada (arquivada)',
    )
    expect(wrapper.get('[data-test="transaction-category"]').text()).toContain(
      'Contas antigas (arquivada)',
    )
    expect(wrapper.get('[data-test="transaction-status"]').element.value).toBe('effective')
    expect(wrapper.get('[data-test="transaction-amount"]').element.value).toBe('1999')
    expect(wrapper.get('[data-test="transaction-date"]').element.value).toBe('2026-08-01')

    await wrapper.get('[data-test="save-transaction"]').trigger('click')

    const payload = wrapper.emitted('submit')[0][0]
    expect(payload).toMatchObject({
      type: 'expense',
      status: 'effective',
      description: 'Conta antiga',
      notes: 'Nota histórica',
      amount_centavos: 1999,
      transaction_date: '2026-08-01',
      financial_account_id: 9,
      category_id: 7,
    })
    expect(payload).not.toHaveProperty('id')
    expect(payload).not.toHaveProperty('financial_account')
    expect(payload).not.toHaveProperty('removed_at')
  })

  it('never offers an archived association for a new transaction', () => {
    const wrapper = mount(TransactionFormDialog, {
      props: {
        modelValue: true,
        accounts: [{ id: 1, name: 'Conta principal', status: 'active' }],
        categories: [
          { id: 2, name: 'Alimentação', status: 'active', classification: 'expense' },
          { id: 3, name: 'Salário', status: 'active', classification: 'income' },
        ],
      },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.text()).not.toContain('(arquivada)')
    expect(wrapper.get('[data-test="transaction-category"]').text()).toContain('Alimentação')
    expect(wrapper.get('[data-test="transaction-category"]').text()).not.toContain('Salário')
  })

  it('blocks duplicate submits while a save is in flight', async () => {
    const wrapper = mount(TransactionFormDialog, {
      props: { modelValue: true, saving: true, accounts: [], categories: [] },
      global: { plugins: [i18n], stubs },
    })

    await wrapper.get('[data-test="save-transaction"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('shows server field feedback next to the matching control', () => {
    const wrapper = mount(TransactionFormDialog, {
      props: {
        modelValue: true,
        accounts: [],
        categories: [],
        errors: { amount_centavos: ['Valor inválido.'], status: ['Data futura exige pendente.'] },
      },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.text()).toContain('Valor inválido.')
    expect(wrapper.text()).toContain('Data futura exige pendente.')
  })
})
