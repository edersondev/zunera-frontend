import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardOverviewCard from '../CreditCardOverviewCard.vue'

const stubs = {
  ElTag: { template: '<span><slot /></span>' },
}

function card(overrides = {}) {
  return {
    id: 44,
    name: 'Nubank Platinum',
    institution_name: 'Nubank',
    last_four: '1234',
    summary: {
      credit_limit: { amount_centavos: 500_000 },
      used_credit: { amount_centavos: 125_000 },
      available_credit: { amount_centavos: 375_000 },
      is_over_limit: false,
    },
    current_statement: {
      id: 91,
      net_amount: { amount_centavos: 125_000 },
      outstanding_amount: { amount_centavos: 0 },
      due_date: '2026-10-25',
      status: 'paid',
    },
    ...overrides,
  }
}

describe('CreditCardOverviewCard', () => {
  it('keeps a paid statement meaningful without inventing a payment date', () => {
    const wrapper = mount(CreditCardOverviewCard, {
      props: { card: card() },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.text()).toContain('Nubank Platinum')
    expect(wrapper.text()).toContain('•••• 1234')
    expect(wrapper.text()).toContain('1.250,00')
    expect(wrapper.text()).toContain('Nenhum saldo em aberto')
    expect(wrapper.text()).toContain('Paga')
    expect(wrapper.text()).not.toContain('Vence em 25/10/2026')
  })
})
