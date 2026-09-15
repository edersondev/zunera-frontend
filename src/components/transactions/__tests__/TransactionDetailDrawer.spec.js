import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TransactionDetailDrawer from '../TransactionDetailDrawer.vue'

const stubs = {
  ElDrawer: {
    props: ['modelValue', 'title'],
    template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>',
  },
  ElDescriptions: { template: '<dl><slot /></dl>' },
  ElDescriptionsItem: { props: ['label'], template: '<div><dt>{{ label }}</dt><dd><slot /></dd></div>' },
  ElButton: { emits: ['click'], template: '<button type="button" @click="$emit(\'click\')"><slot /></button>' },
}

function transaction(overrides = {}) {
  return {
    id: 12,
    description: 'Assinatura',
    amount_centavos: 2500,
    transaction_date: '2026-09-14',
    status: 'pending',
    notes: null,
    financial_account: { id: 1, name: 'Conta', status: 'active' },
    category: { id: 2, name: 'Assinaturas', status: 'active' },
    recurrence_source: null,
    ...overrides,
  }
}

function factory(value) {
  return mount(TransactionDetailDrawer, {
    props: { modelValue: true, transaction: value },
    global: { plugins: [i18n], stubs },
  })
}

describe('TransactionDetailDrawer recurrence source', () => {
  it('omits the source row for ordinary transactions', () => {
    const wrapper = factory(transaction())

    expect(wrapper.find('[data-test="transaction-recurrence-source"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="transaction-recurrence-scope"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="view-recurrence-rule"]').exists()).toBe(false)
  })

  it('shows the rule and date for a generated occurrence and explains the edit scope', async () => {
    const wrapper = factory(
      transaction({ recurrence_source: { id: 7, scheduled_date: '2026-09-14' } }),
    )

    const source = wrapper.find('[data-test="transaction-recurrence-source"]')
    expect(source.text()).toContain('#7')
    expect(source.text()).toContain('14/09/2026')
    expect(wrapper.find('[data-test="transaction-recurrence-scope"]').text()).toBe(
      'Você está editando apenas esta ocorrência.',
    )

    await wrapper.find('[data-test="view-recurrence-rule"]').trigger('click')
    expect(wrapper.emitted('view-rule')[0]).toEqual([7])
  })

  it('never labels transfers as generated recurrences', () => {
    const wrapper = factory(
      transaction({
        movement_kind: 'transfer',
        source_financial_account: { id: 1, name: 'A', status: 'active' },
        destination_financial_account: { id: 2, name: 'B', status: 'active' },
        recurrence_source: { id: 9, scheduled_date: '2026-09-14' },
      }),
    )

    expect(wrapper.find('[data-test="transaction-recurrence-source"]').exists()).toBe(false)
  })
})
