import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportEvolution from '../ReportEvolution.vue'
import { money } from './reportFixtures'

const intervals = [{ from: '2026-03-01', to: '2026-03-07', is_partial: false, realized_income: money(1000), realized_expenses: money(200), financial_result: money(800) }, { from: '2026-03-08', to: '2026-03-09', is_partial: true, realized_income: money(0), realized_expenses: money(400), financial_result: money(-400) }]
function render(rows = intervals) { return mount(ReportEvolution, { props: { intervals: rows, granularity: 'week' }, global: { plugins: [i18n], stubs: { BaseChart: { name: 'BaseChart', props: ['label', 'options'], template: '<div role="img" :aria-label="label" />' } } } }) }

describe('ReportEvolution', () => {
  it('shows income and expense values in a text table with partial boundaries', () => {
    const wrapper = render()
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('Evolução financeira')
    expect(wrapper.get('details').element.open).toBe(false)
    expect(wrapper.get('table').text()).toContain('10,00')
    expect(wrapper.get('table').text()).toContain('4,00')
    expect(wrapper.get('table').text()).toContain('Período parcial')
    expect(wrapper.get('table').text()).toContain('-R$')
    const tooltip = wrapper.getComponent({ name: 'BaseChart' }).props('options').tooltip.custom({ dataPointIndex: 0 })
    expect(tooltip).toContain('report-income-amount')
    expect(tooltip).toContain('report-expense-amount')
  })
  it('uses a distinct empty state', () => { expect(render([]).text()).toContain('Nenhuma atividade realizada') })
  it('disables chart animation under reduced motion and uses datetime ticks', async () => {
    const original = window.matchMedia
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    try {
      const wrapper = render()
      await wrapper.vm.$nextTick()
      const options = wrapper.getComponent({ name: 'BaseChart' }).props('options')
      expect(options.chart.animations.enabled).toBe(false)
      expect(options.xaxis.type).toBe('datetime')
      wrapper.unmount()
    } finally {
      window.matchMedia = original
    }
  })
})
