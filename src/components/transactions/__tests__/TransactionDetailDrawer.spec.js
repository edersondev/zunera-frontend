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
  ElButton: {
    props: ['icon', 'type'],
    emits: ['click'],
    template: '<button type="button" :data-type="type" @click="$emit(\'click\')"><component :is="icon" /><slot /></button>',
  },
  ElLink: {
    props: ['type'],
    emits: ['click'],
    template: '<a href="#" :data-type="type" @click.prevent="$emit(\'click\')"><slot /></a>',
  },
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
    expect(wrapper.get('[data-test="view-recurrence-rule"]').attributes('data-type')).toBe('primary')
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

  it('uses the standard cancel style when closing a transfer detail', () => {
    const wrapper = factory(
      transaction({
        movement_kind: 'transfer',
        source_financial_account: { id: 1, name: 'A', status: 'active' },
        destination_financial_account: { id: 2, name: 'B', status: 'active' },
      }),
    )
    const cancel = wrapper.get('[data-test="close-transfer-detail"]')

    expect(cancel.attributes('data-type')).toBe('danger')
    expect(cancel.find('svg').exists()).toBe(true)
  })
})
