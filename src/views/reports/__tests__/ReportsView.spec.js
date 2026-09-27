import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { i18n } from '@/i18n'
import ReportsView from '../ReportsView.vue'
import { money, scope, summary } from '@/components/reports/__tests__/reportFixtures'

vi.mock('@/services/reportsService', () => ({ getFinancialReport: vi.fn(), getFinancialReportContributions: vi.fn() }))
vi.mock('@/services/financialAccountService', () => ({ listFinancialAccounts: vi.fn().mockResolvedValue([]) }))
vi.mock('@/services/categoryService', () => ({ listCategories: vi.fn().mockResolvedValue([]) }))
const { getFinancialReport } = await import('@/services/reportsService')
const sectionStates = Object.fromEntries(['summary', 'evolution', 'expense_categories', 'income_categories', 'accounts', 'comparison'].map((name) => [name, { status: 'available', message: null }]))
function report(changes = {}) { return { scope, section_states: sectionStates, summary, evolution_granularity: 'day', evolution: [], expense_categories: [], income_categories: [], accounts: [], unattributed_card_expenses: money(0), comparison: { realized_income: {}, realized_expenses: {}, financial_result: {}, expense_categories: [] }, empty_states: { no_activity: false, no_income: false, no_expenses: false, no_filter_matches: false, no_previous_activity: false }, ...changes } }
async function render() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/app/reports', name: 'reports', component: ReportsView }] })
  await router.push('/app/reports')
  await router.isReady()
  const wrapper = shallowMount(ReportsView, { global: { plugins: [i18n, createPinia(), router], stubs: { ElAlert: { name: 'ElAlert', props: ['title'], template: '<div><span>{{ title }}</span><slot /></div>' }, ElButton: { name: 'ElButton', emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' }, ElSkeleton: { name: 'ElSkeleton', template: '<div />' } } } })
  await flushPromises()
  return wrapper
}
describe('ReportsView states', () => {
  beforeEach(() => { setActivePinia(createPinia()); getFinancialReport.mockReset() })
  it('renders available empty sections and distinct no-activity guidance', async () => {
    getFinancialReport.mockResolvedValue(report({ empty_states: { no_activity: true, no_income: true, no_expenses: true, no_filter_matches: false, no_previous_activity: true } }))
    const wrapper = await render()
    expect(wrapper.get('[data-test="report-empty"]').text()).toContain('Nenhuma atividade')
    expect(wrapper.findComponent({ name: 'ReportSummary' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ReportEvolution' }).exists()).toBe(true)
  })
  it('keeps reliable sibling sections when evolution is unavailable', async () => {
    getFinancialReport.mockResolvedValue(report({ section_states: { ...sectionStates, evolution: { status: 'unavailable', message: 'Temporarily unavailable' } }, evolution: null }))
    const wrapper = await render()
    expect(wrapper.get('[data-test="report-evolution-unavailable"]').text()).toContain('Temporarily unavailable')
    expect(wrapper.findComponent({ name: 'ReportSummary' }).exists()).toBe(true)
  })
  it('offers retry after an overview failure', async () => {
    getFinancialReport.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(report())
    const wrapper = await render()
    expect(wrapper.get('[data-test="report-error"]').text()).toContain('Não foi possível carregar')
    await wrapper.get('[data-test="report-retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ReportSummary' }).exists()).toBe(true)
  })
})
