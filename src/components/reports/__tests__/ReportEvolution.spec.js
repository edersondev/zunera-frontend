import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportEvolution from '../ReportEvolution.vue'
import { money } from './reportFixtures'

const intervals = [{ from: '2026-03-01', to: '2026-03-07', is_partial: false, realized_income: money(1000), realized_expenses: money(200), financial_result: money(800) }, { from: '2026-03-08', to: '2026-03-09', is_partial: true, realized_income: money(0), realized_expenses: money(400), financial_result: money(-400) }]
function render(rows = intervals) { return mount(ReportEvolution, { props: { intervals: rows, granularity: 'week' }, global: { plugins: [i18n], stubs: { BaseChart: { name: 'BaseChart', props: ['label'], template: '<div role="img" :aria-label="label" />' } } } }) }

describe('ReportEvolution', () => {
  it('shows income and expense values in a text table with partial boundaries', () => {
    const wrapper = render()
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Evolução financeira')
    expect(wrapper.get('table').text()).toContain('10,00')
    expect(wrapper.get('table').text()).toContain('4,00')
    expect(wrapper.get('table').text()).toContain('Período parcial')
  })
  it('uses a distinct empty state', () => { expect(render([]).text()).toContain('Nenhuma atividade realizada') })
})
