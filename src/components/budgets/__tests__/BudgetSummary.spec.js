import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetSummary from '../BudgetSummary.vue'

function money(amountCentavos) {
  return { amount_centavos: amountCentavos, currency_code: 'BRL' }
}

function summary(overrides = {}) {
  return {
    total_planned: money(100_000),
    budgeted_realized: money(72_000),
    actual_available: money(28_000),
    overall_utilization_percent: 72,
    overall_status: 'within',
    unbudgeted_expenses: money(12_500),
    total_expenses: money(84_500),
    expected: null,
    projected_spending: null,
    projected_available: null,
    projected_status: null,
    ...overrides,
  }
}

function mountSummary(overrides = {}) {
  return mount(BudgetSummary, { props: { summary: summary(overrides) } })
}

describe('BudgetSummary', () => {
  it('shows planned, realized, available, utilisation, status, and both expense totals', () => {
    const wrapper = mountSummary()

    expect(wrapper.get('[data-test="budget-summary-planned"]').text()).toContain('1.000,00')
    expect(wrapper.get('[data-test="budget-summary-realized"]').text()).toContain('720,00')
    expect(wrapper.get('[data-test="budget-summary-available"]').text()).toContain('280,00')
    expect(wrapper.get('[data-test="budget-summary-utilization"]').text()).toContain('72%')
    expect(wrapper.get('[data-test="budget-summary-status"]').text()).toBe('Dentro do orçamento')
    expect(wrapper.get('[data-test="budget-summary-unbudgeted"]').text()).toContain('125,00')
    expect(wrapper.get('[data-test="budget-summary-total-expenses"]').text()).toContain('845,00')
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(true)
  })

  it('states an exceeded month with words and an explicit excess value', () => {
    const wrapper = mountSummary({
      budgeted_realized: money(107_000),
      actual_available: money(-7_000),
      overall_utilization_percent: 107,
      overall_status: 'exceeded',
    })

    expect(wrapper.get('[data-test="budget-summary-status"]').text()).toBe('Orçamento excedido')
    expect(wrapper.get('[data-test="budget-summary-excess"]').text()).toContain('70,00')
  })

  it('marks a zero-plan month as not applicable with zero money totals', () => {
    const wrapper = mountSummary({
      total_planned: money(0),
      budgeted_realized: money(0),
      actual_available: money(0),
      overall_utilization_percent: null,
      overall_status: 'not_applicable',
      unbudgeted_expenses: money(25_000),
      total_expenses: money(25_000),
    })

    expect(wrapper.get('[data-test="budget-summary-status"]').text()).toBe('Não aplicável')
    expect(wrapper.get('[data-test="budget-summary-utilization"]').text()).toContain('Não aplicável')
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="budget-summary-unbudgeted"]').text()).toContain('250,00')
  })

  it('separates projected values from realized truth when a projection exists', () => {
    const wrapper = mountSummary({
      expected: money(20_000),
      projected_spending: money(92_000),
      projected_available: money(8_000),
      projected_status: 'approaching',
    })

    const projection = wrapper.get('[data-test="budget-summary-projection"]')
    expect(projection.text()).toContain('920,00')
    expect(projection.text()).toContain('Aproximando do limite')
    expect(projection.text()).toContain('não alteram o realizado')
    expect(wrapper.get('[data-test="budget-summary-realized"]').text()).toContain('720,00')
  })
})
