import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportSummary from '../ReportSummary.vue'
import { buttonStub, money, summary } from './reportFixtures'

function mountSummary(data = summary) { return mount(ReportSummary, { props: { summary: data }, global: { plugins: [i18n], stubs: { ElButton: buttonStub } } }) }

describe('ReportSummary', () => {
  it('shows signed result with a readable, non-color cue and detail action', async () => {
    const wrapper = mountSummary()
    expect(wrapper.get('[data-test="report-financial_result"]').text()).toContain('2.000,00')
    expect(wrapper.get('[data-test="report-result-cue"]').text()).toBe('Resultado positivo')
    await wrapper.get('[data-test="report-financial_result"] button').trigger('click')
    expect(wrapper.emitted('detail')[0][0]).toMatchObject({ metric: 'financial_result' })
  })
  it('labels negative and zero-side results without hiding a zero amount', () => {
    const negative = mountSummary({ realized_income: money(0), realized_expenses: money(300), financial_result: money(-300) })
    expect(negative.get('[data-test="report-realized_income"]').text()).toContain('0,00')
    expect(negative.get('[data-test="report-result-cue"]').text()).toBe('Resultado negativo')
    expect(mountSummary({ realized_income: money(0), realized_expenses: money(0), financial_result: money(0) }).get('[data-test="report-result-cue"]').text()).toBe('Resultado neutro')
  })
})
