import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import TransactionHistoryList from '../TransactionHistoryList.vue'
import { i18n } from '@/i18n'

const income = { id: 1, movement_kind: 'income', type: 'income', status: 'effective', description: 'Salário', amount_centavos: 500_000, movement_date: '2026-09-11', financial_account: { id: 1, name: 'Principal' }, category: { id: 2, name: 'Salário' } }
const transfer = { id: 2, movement_kind: 'transfer', status: 'pending', description: 'Reserva', amount_centavos: 100_000, movement_date: '2026-09-11', source_financial_account: { id: 1, name: 'Principal' }, destination_financial_account: { id: 3, name: 'Poupança' }, category: null }
const card = { id: 3, movement_kind: 'credit_card_expense', type: 'expense', status: 'effective', description: 'Mercado', amount_centavos: 20_000, movement_date: '2026-09-09', credit_card: { name: 'Cartão teal' }, category: { id: 4, name: 'Alimentação' } }

function mountList(props = {}) {
  return mount(TransactionHistoryList, {
    props: { items: [income, transfer, card], meta: { total: 3 }, loading: false, hasMore: false, filtered: false, ...props },
    global: { plugins: [ElementPlus, i18n] },
  })
}

describe('TransactionHistoryList', () => {
  it('groups each loaded movement once and preserves order and financial signs', () => {
    const wrapper = mountList()
    expect(wrapper.findAll('.date-group')).toHaveLength(2)
    expect(wrapper.findAll('.history-item')).toHaveLength(3)
    expect(wrapper.findAll('.date-group')[0].text()).toContain('Salário')
    expect(wrapper.findAll('.date-group')[0].text()).toContain('Reserva')
    expect(wrapper.get('[data-test="history-item-income-1"] .history-amount').text()).toContain('+ R$')
    expect(wrapper.get('[data-test="history-item-transfer-2"] .history-amount').text()).not.toMatch(/[+−]/)
  })

  it('expands one row at a time and leaves card expense read-only', async () => {
    const wrapper = mountList()
    await wrapper.get('[data-test="history-toggle-income-1"]').trigger('click')
    expect(wrapper.get('[data-test="history-toggle-income-1"]').attributes('aria-expanded')).toBe('true')
    await wrapper.get('[data-test="history-toggle-transfer-2"]').trigger('click')
    expect(wrapper.get('[data-test="history-toggle-income-1"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('[data-test="history-toggle-transfer-2"]').attributes('aria-expanded')).toBe('true')
    await wrapper.get('[data-test="history-toggle-credit_card_expense-3"]').trigger('click')
    expect(wrapper.get('[data-test="history-item-credit_card_expense-3"]').text()).toContain('Cartão teal')
    expect(wrapper.get('[data-test="history-item-credit_card_expense-3"]').find('[data-test="view-history-details"]').exists()).toBe(false)
  })

  it('clears expansion when period changes or row disappears', async () => {
    const wrapper = mountList()
    await wrapper.get('[data-test="history-toggle-income-1"]').trigger('click')
    await wrapper.setProps({ resetKey: 'october' })
    expect(wrapper.get('[data-test="history-toggle-income-1"]').attributes('aria-expanded')).toBe('false')
    await wrapper.get('[data-test="history-toggle-income-1"]').trigger('click')
    await wrapper.setProps({ items: [transfer, card] })
    expect(wrapper.find('[data-test="history-item-income-1"]').exists()).toBe(false)
  })

  it('distinguishes filtered, empty-month, and no-history states', async () => {
    const wrapper = mountList({ items: [], meta: { total: 0 }, filtered: true })
    expect(wrapper.text()).toContain('Nenhuma transação corresponde')
    await wrapper.get('[data-test="empty-clear-filters"]').trigger('click')
    expect(wrapper.emitted('clear-filters')).toHaveLength(1)
    await wrapper.setProps({ filtered: false })
    expect(wrapper.text()).toContain('Nenhuma movimentação neste período')
    await wrapper.setProps({ emptyKind: 'none' })
    expect(wrapper.text()).toContain('Nenhuma transação cadastrada')
  })
})
