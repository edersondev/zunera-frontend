import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportAccountActivity from '../ReportAccountActivity.vue'
import { account, buttonStub, money } from './reportFixtures'

const row = { account, realized_income: money(50000), direct_expenses: money(10000), net_financial_flow: money(40000), transfer_in: money(3000), transfer_out: money(7000), card_settlement: money(2000) }
describe('ReportAccountActivity', () => {
  it('keeps direct flow, transfer directions, settlements, and unattributed card expense distinct', async () => {
    const wrapper = mount(ReportAccountActivity, { props: { accounts: [row], unattributedCardExpenses: money(22000) }, global: { plugins: [i18n], stubs: { ElButton: buttonStub } } })
    expect(wrapper.text()).toContain('Arquivada')
    expect(wrapper.text()).toContain('Transferências recebidas')
    expect(wrapper.text()).toContain('Transferências enviadas')
    expect(wrapper.text()).toContain('Pagamento de fatura')
    expect(wrapper.text()).toContain('Compras no cartão não são atribuídas')
    expect(wrapper.get('details').element.open).toBe(false)
    await wrapper.findAll('button')[5].trigger('click')
    expect(wrapper.emitted('detail')[0][0]).toMatchObject({ metric: 'account_card_settlement', metric_id: 7 })
  })
  it('hides uncategorized transfer and settlement metrics under a type or category filter', () => {
    const wrapper = mount(ReportAccountActivity, { props: { accounts: [row], suppressMovements: true }, global: { plugins: [i18n], stubs: { ElButton: buttonStub } } })
    expect(wrapper.text()).toContain('Fluxo financeiro líquido')
    expect(wrapper.text()).not.toContain('Transferências recebidas')
    expect(wrapper.text()).not.toContain('Pagamento de fatura')
    expect(wrapper.text()).toContain('não se aplicam')
  })
})
