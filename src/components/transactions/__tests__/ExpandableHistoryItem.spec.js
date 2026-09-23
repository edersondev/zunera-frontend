import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import ExpandableHistoryItem from '../ExpandableHistoryItem.vue'
import { i18n } from '@/i18n'

const expense = {
  id: 42,
  movement_kind: 'expense',
  type: 'expense',
  description: 'Mercado de bairro',
  amount_centavos: 18_590,
  movement_date: '2026-09-23',
  status: 'effective',
  financial_account: { id: 1, name: 'Conta principal' },
  category: { id: 2, name: 'Alimentação' },
  notes: 'Compra semanal',
}

function mountItem(row = expense, expanded = false) {
  return mount(ExpandableHistoryItem, {
    props: { row, expanded },
    global: { plugins: [ElementPlus, i18n] },
  })
}

describe('ExpandableHistoryItem', () => {
  it('exposes an accessible header and existing transaction information', async () => {
    const wrapper = mountItem()
    const toggle = wrapper.get('[data-test="history-toggle-expense-42"]')

    expect(toggle.element.tagName).toBe('BUTTON')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.attributes('aria-controls')).toBe('history-details-expense-42')
    expect(toggle.text()).toContain('Mercado de bairro')
    expect(toggle.text()).toContain('Alimentação')
    expect(toggle.text()).toContain('Conta principal')
    expect(toggle.text()).toMatch(/R\$\s185,90/)
    await toggle.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['expense-42']])
  })

  it('reveals details and keeps action clicks separate from expansion', async () => {
    const wrapper = mountItem(expense, true)
    expect(wrapper.get('[data-test="history-details-expense-42"]').isVisible()).toBe(true)
    expect(wrapper.text()).toContain('Compra semanal')
    await wrapper.get('[data-test="view-history-details"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual(expense)
    expect(wrapper.emitted('toggle')).toBeUndefined()
  })

  it('shows a transfer route and no expense sign', () => {
    const wrapper = mountItem({
      id: 7,
      movement_kind: 'transfer',
      description: 'Reserva',
      amount_centavos: 50_000,
      movement_date: '2026-09-23',
      source_financial_account: { name: 'Principal' },
      destination_financial_account: { name: 'Poupança' },
    })

    expect(wrapper.get('[data-test="transfer-history-route"]').text()).toContain('Principal')
    expect(wrapper.get('[data-test="transfer-history-route"]').text()).toContain('Poupança')
    expect(wrapper.get('[data-test="transfer-history-amount"]').text()).not.toMatch(/[+−]/)
  })

  it('labels recognized card closing dates and recurring next occurrences accurately', () => {
    const card = mountItem({
      id: 8,
      movement_kind: 'credit_card_expense',
      description: 'Farmácia',
      amount_centavos: 12_500,
      movement_date: '2026-09-23',
      credit_card: { name: 'Cartão' },
      installment: { sequence: 1, total_count: 2 },
    }, true)
    expect(card.get('.detail-grid').text()).toContain('Fechamento')
    expect(card.get('.history-toggle').text()).toContain('1/2')
    expect(card.find('[data-test="view-history-details"]').exists()).toBe(false)

    const recurring = mountItem({
      id: 9,
      movement_kind: 'recurring',
      type: 'expense',
      description: 'Internet',
      amount_centavos: 15_000,
      movement_date: '2026-10-05',
      state: 'active',
      frequency: 'monthly',
    }, true)
    expect(recurring.get('.detail-grid').text()).toContain('Próxima ocorrência')
    expect(recurring.get('.detail-grid').text()).toContain('Ativa')
    expect(recurring.find('[data-test="view-history-details"]').exists()).toBe(false)
  })
})
