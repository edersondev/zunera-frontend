import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardSummary from '../CreditCardSummary.vue'

const stubs = {
  ElAlert: { props: ['title'], template: '<div role="alert">{{ title }}<slot /></div>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElEmpty: { props: ['description'], template: '<div>{{ description }}</div>' },
  ElSkeleton: { template: '<div />' },
  ElTag: { template: '<span><slot /></span>' },
}

function projection() {
  return {
    outstanding_obligation: { amount_centavos: 12_345, currency_code: 'BRL' },
    card_credit: { amount_centavos: 0, currency_code: 'BRL' },
    available_credit: { amount_centavos: -345, currency_code: 'BRL' },
    cards: [
      {
        id: 41,
        name: 'Nubank Platinum',
        institution_name: 'Nubank',
        last_four: '1234',
        summary: {
          credit_limit: { amount_centavos: 12_000 },
          used_credit: { amount_centavos: 12_345 },
          available_credit: { amount_centavos: -345 },
          is_over_limit: true,
        },
        current_statement: {
          id: 17,
          outstanding_amount: { amount_centavos: 12_345 },
          net_amount: { amount_centavos: 12_345 },
          due_date: '2026-10-05',
          status: 'overdue',
        },
      },
    ],
    upcoming_statements: [
      {
        id: 72,
        card: { name: 'Nubank Platinum' },
        due_date: '2026-10-05',
        status: 'overdue',
        outstanding_amount: { amount_centavos: 12_345 },
      },
    ],
  }
}

function mountCard(props = {}) {
  return mount(CreditCardSummary, {
    props: { projection: projection(), ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('CreditCardSummary', () => {
  it('shows card obligations, available credit, due date, and a readable overdue status', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="dashboard-credit-cards-outstanding"]').text()).toContain(
      '123,45',
    )
    expect(wrapper.get('[data-test="dashboard-credit-cards-used"]').text()).toContain('123,45')
    expect(wrapper.get('[data-test="dashboard-credit-cards-total-limit"]').text()).toContain(
      '120,00',
    )
    expect(wrapper.get('[data-test="dashboard-credit-cards-available"]').text()).toMatch(
      /^-R\$\s?3,45/,
    )
    expect(wrapper.get('[data-test="dashboard-credit-cards-over-limit"]').text()).toContain(
      'Acima do limite',
    )
    expect(wrapper.get('[data-test="dashboard-credit-card-41"]').text()).toContain(
      'Nubank Platinum',
    )
    expect(wrapper.get('[data-test="dashboard-credit-card-41"]').text()).toContain('Vencida')
    expect(
      wrapper.get('[data-test="credit-utilization-progress"]').attributes('aria-valuenow'),
    ).toBe('100')
    expect(wrapper.get('[data-test="dashboard-credit-card-statement-72"]').text()).toContain(
      '05/10/2026',
    )
    expect(wrapper.get('[data-test="dashboard-credit-card-statement-72"]').text()).toContain(
      'Vencida',
    )
  })

  it('explains a zero-balance card without treating it as an empty dashboard', () => {
    const wrapper = mountCard({
      projection: {
        outstanding_obligation: { amount_centavos: 0 },
        available_credit: { amount_centavos: 500_000 },
        cards: [
          {
            id: 22,
            name: 'Card zero',
            summary: {
              credit_limit: { amount_centavos: 500_000 },
              used_credit: { amount_centavos: 0 },
              available_credit: { amount_centavos: 500_000 },
              is_over_limit: false,
            },
            current_statement: {
              id: null,
              outstanding_amount: { amount_centavos: 0 },
              net_amount: { amount_centavos: 0 },
              status: 'open',
            },
          },
        ],
        upcoming_statements: [],
      },
    })

    expect(wrapper.get('[data-test="dashboard-credit-card-22"]').text()).toContain(
      'Nenhum saldo em aberto',
    )
    expect(wrapper.get('[data-test="credit-utilization-percent"]').text()).toBe('0%')
  })

  it('explains empty data and emits the independent retry action', async () => {
    const empty = mountCard({ projection: { cards: [] } })
    expect(empty.get('[data-test="dashboard-credit-cards-empty"]').text()).toContain(
      'Nenhum cartão',
    )

    const failed = mountCard({ projection: null, error: new Error('boom') })
    await failed.get('[data-test="dashboard-credit-cards-retry"]').trigger('click')
    expect(failed.emitted('retry')).toHaveLength(1)
  })
})
