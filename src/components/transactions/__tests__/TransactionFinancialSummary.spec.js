import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionFinancialSummary from '../TransactionFinancialSummary.vue'
import { i18n } from '@/i18n'

describe('TransactionFinancialSummary', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it('formats backend totals as signed realized values', () => {
    const wrapper = mount(TransactionFinancialSummary, {
      props: {
        totals: {
          income_centavos: 500_000,
          expense_centavos: 200_000,
          financial_result_centavos: 300_000,
        },
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.get('[data-test="history-total-income"]').text()).toBe('+ R$ 5.000,00')
    expect(wrapper.get('[data-test="history-total-expense"]').text()).toBe('− R$ 2.000,00')
    expect(wrapper.get('[data-test="history-total-result"]').text()).toBe('R$ 3.000,00')
    expect(wrapper.get('[data-test="history-total-result"]').classes()).toContain('result-positive')
    expect(wrapper.get('[data-test="history-total-excludes"]').text()).toContain(
      'Transações pendentes',
    )
    expect(wrapper.get('[data-test="history-total-excludes"]').text()).toContain('transferências')
  })

  it('uses negative and neutral result treatments without inventing totals', async () => {
    const wrapper = mount(TransactionFinancialSummary, {
      props: {
        totals: {
          income_centavos: 0,
          expense_centavos: 200,
          financial_result_centavos: -200,
        },
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.get('[data-test="history-total-result"]').classes()).toContain('result-negative')

    await wrapper.setProps({
      totals: { income_centavos: 0, expense_centavos: 0, financial_result_centavos: 0 },
    })
    expect(wrapper.get('[data-test="history-total-result"]').classes()).toContain('result-neutral')
  })

  it('renders nothing before authoritative totals arrive', () => {
    const wrapper = mount(TransactionFinancialSummary, {
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('[data-test="history-totals"]').exists()).toBe(false)
  })

  it('reports a month without qualifying movements as zero realized values', () => {
    const wrapper = mount(TransactionFinancialSummary, {
      props: {
        totals: {
          income_centavos: 0,
          expense_centavos: 0,
          financial_result_centavos: 0,
          currency_code: 'BRL',
        },
      },
      global: { plugins: [i18n] },
    })

    // Intl inserts a non-breaking space between the symbol and the amount.
    expect(wrapper.get('[data-test="history-total-income"]').text()).toBe('+ R$\u00A00,00')
    expect(wrapper.get('[data-test="history-total-expense"]').text()).toBe('− R$\u00A00,00')
    expect(wrapper.get('[data-test="history-total-result"]').text()).toBe('R$\u00A00,00')
  })
})
