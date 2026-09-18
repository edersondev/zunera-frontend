import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import FinancialEvolutionChart from '../FinancialEvolutionChart.vue'
import { dashboardEvolutionFixture } from '@/services/__tests__/fixtures/dashboardFixtures'

const stubs = {
  BaseChart: {
    name: 'BaseChart',
    props: ['series', 'options', 'label'],
    template: '<div data-test="base-chart" :aria-label="label" />',
  },
}

describe('FinancialEvolutionChart', () => {
  it('uses the dashboard realized series without recalculating the financial result', () => {
    const wrapper = mount(FinancialEvolutionChart, {
      props: { evolution: dashboardEvolutionFixture() },
      global: { plugins: [i18n], stubs },
    })

    const chart = wrapper.getComponent({ name: 'BaseChart' })
    expect(chart.props('series')).toEqual([
      { name: 'Receitas', data: [320_000, 0] },
      { name: 'Despesas', data: [0, 120_000] },
    ])
    expect(chart.props('options').xaxis.categories).toEqual(['01/09', '02/09'])
    expect(wrapper.get('[data-test="dashboard-evolution-text-alternative"]').text()).toContain(
      'R$ 3.200,00',
    )
  })
})
