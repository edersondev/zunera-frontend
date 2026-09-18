import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import FinancialSummaryCards from '../FinancialSummaryCards.vue'
import { dashboardSummaryFixture } from '@/services/__tests__/fixtures/dashboardFixtures'

const stubs = {
  ElAlert: {
    name: 'ElAlert',
    props: ['title'],
    template: '<div role="alert"><p>{{ title }}</p><slot /></div>',
  },
  ElButton: {
    name: 'ElButton',
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  ElSkeleton: {
    name: 'ElSkeleton',
    template: '<div class="skeleton" />',
  },
}

function mountCards(props = {}) {
  return mount(FinancialSummaryCards, {
    props: { summary: dashboardSummaryFixture(), ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('FinancialSummaryCards', () => {
  it('renders the current balance beside the realized period values', () => {
    const wrapper = mountCards()

    expect(wrapper.get('[data-test="dashboard-summary-balance-value"]').text()).toContain(
      '5.000,00',
    )
    expect(wrapper.get('[data-test="dashboard-summary-income-value"]').text()).toContain('3.200,00')
    expect(wrapper.get('[data-test="dashboard-summary-expenses-value"]').text()).toContain(
      '1.200,00',
    )
    expect(wrapper.get('[data-test="dashboard-summary-result-value"]').text()).toContain('2.000,00')
    expect(wrapper.get('[data-test="dashboard-summary-balance"]').text()).toContain(
      'Saldo das contas ativas agora; não muda com o período.',
    )
    expect(wrapper.text()).toContain(
      'Transferências não entram nas receitas, despesas ou resultado.',
    )
  })

  it('labels the result direction without relying on color alone', async () => {
    const wrapper = mountCards()

    expect(wrapper.get('[data-test="dashboard-summary-result-cue"]').text()).toBe(
      'Resultado positivo',
    )
    expect(wrapper.get('[data-test="dashboard-summary-result-value"]').classes()).toContain(
      'result-positive',
    )

    await wrapper.setProps({
      summary: dashboardSummaryFixture({
        financial_result: { amount_centavos: -1, currency_code: 'BRL' },
      }),
    })
    expect(wrapper.get('[data-test="dashboard-summary-result-cue"]').text()).toBe(
      'Resultado negativo',
    )
    expect(wrapper.get('[data-test="dashboard-summary-result-value"]').classes()).toContain(
      'result-negative',
    )

    await wrapper.setProps({
      summary: dashboardSummaryFixture({
        financial_result: { amount_centavos: 0, currency_code: 'BRL' },
      }),
    })
    expect(wrapper.get('[data-test="dashboard-summary-result-cue"]').text()).toBe(
      'Resultado neutro',
    )
  })

  it('keeps a failed summary recoverable with an explicit retry action', async () => {
    const wrapper = mountCards({ summary: null, error: new Error('boom') })

    expect(wrapper.get('[data-test="dashboard-summary-error"]').text()).toContain(
      'Não foi possível carregar o resumo.',
    )

    await wrapper.get('[data-test="dashboard-summary-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('preserves the expected layout while loading', () => {
    const wrapper = mountCards({ summary: null, loading: true })

    expect(wrapper.find('[data-test="dashboard-summary-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-summary-balance-value"]').exists()).toBe(false)
  })
})
