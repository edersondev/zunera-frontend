import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardsOverview from '../CreditCardsOverview.vue'

const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })

const cards = [
  {
    summary: {
      credit_limit: money(500_000),
      used_credit: money(125_000),
      available_credit: money(375_000),
    },
    current_statement: { outstanding_amount: money(40_000) },
  },
  {
    summary: {
      credit_limit: money(200_000),
      used_credit: money(20_000),
      available_credit: money(180_000),
    },
    current_statement: { outstanding_amount: money(5_000) },
  },
]

describe('CreditCardsOverview', () => {
  it('presents active-card aggregates without combining used credit and obligations', () => {
    const wrapper = mount(CreditCardsOverview, {
      props: { cards },
      global: { plugins: [i18n] },
    })

    expect(wrapper.get('[data-test="credit-cards-overview"]').text()).toContain('2 cartões ativos')
    expect(wrapper.get('[data-test="credit-cards-overview-limit"]').text()).toContain('7.000,00')
    expect(wrapper.get('[data-test="credit-cards-overview-used"]').text()).toContain('1.450,00')
    expect(wrapper.get('[data-test="credit-cards-overview-available"]').text()).toContain('5.550,00')
    expect(wrapper.get('[data-test="credit-cards-overview-outstanding"]').text()).toContain('450,00')
  })
})
