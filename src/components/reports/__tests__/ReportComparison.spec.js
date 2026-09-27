import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportComparison from '../ReportComparison.vue'
import { buttonStub, category, money, scope } from './reportFixtures'

const metric = (current, previous, reason = null) => ({ current: money(current), previous: money(previous), difference: money(current - previous), percent_change: reason ? null : 50, percent_unavailable_reason: reason })
const comparison = { realized_income: metric(100, 0, 'previous_nonpositive'), realized_expenses: metric(200, 100, 'unequal_duration'), financial_result: metric(-100, 100, 'sign_crossing'), expense_categories: [{ category, amounts: metric(200, 100) }] }
describe('ReportComparison', () => {
  it('shows both exact periods, signed differences, neutral category changes, and reasons for unsafe percentages', async () => {
    const wrapper = mount(ReportComparison, { props: { comparison, scope }, global: { plugins: [i18n], stubs: { ElButton: buttonStub } } })
    expect(wrapper.text()).toContain('31 de mar. de 2026')
    expect(wrapper.text()).toContain('28 de fev. de 2026')
    expect(wrapper.text()).toContain('31 dias')
    expect(wrapper.text()).toContain('Mudança de sinal')
    expect(wrapper.text()).toContain('Food')
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('detail')[0][0]).toMatchObject({ metric: 'realized_income', which_period: 'previous' })
  })
})
