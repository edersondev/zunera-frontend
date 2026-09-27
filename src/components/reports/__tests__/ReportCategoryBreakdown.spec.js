import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportCategoryBreakdown from '../ReportCategoryBreakdown.vue'
import { buttonStub, category, money } from './reportFixtures'

function render(items, kind = 'expense') { return mount(ReportCategoryBreakdown, { props: { items, kind }, global: { plugins: [i18n], stubs: { ElButton: buttonStub } } }) }
describe('ReportCategoryBreakdown', () => {
  it('ranks archived expense categories and sends identity into detail', async () => {
    const wrapper = render([{ category, total: money(980), share_percent: 75 }])
    expect(wrapper.text()).toContain('Food')
    expect(wrapper.text()).toContain('Arquivada')
    expect(wrapper.text()).toContain('75%')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('detail')[0][0]).toMatchObject({ metric: 'expense_category', metric_id: 3 })
  })
  it('keeps income separate and leaves zero-denominator share unavailable', () => {
    const wrapper = render([{ category: { ...category, classification: 'income' }, total: money(0), share_percent: null }], 'income')
    expect(wrapper.text()).toContain('Receitas por categoria')
    expect(wrapper.text()).toContain('—')
  })
})
