import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportContributionDrawer from '../ReportContributionDrawer.vue'
import { account, buttonStub, category, money, scope } from './reportFixtures'

const row = { source_kind: 'card_credit_adjustment', source_id: 99, recognized_date: '2026-09-12', classification: 'expense', signed_amount: money(-2000), description: 'Paid refund', category, account, related_purchase_id: 51, related_statement_id: 62, related_installment_id: 73, related_credit_event_id: 99 }
const detail = { scope, which_period: 'current', total: money(300000), contributions: [row], next_cursor: 'page-2' }
const stubs = {
  ElDrawer: { name: 'ElDrawer', emits: ['update:modelValue'], template: '<section><slot /><slot name="footer" /></section>' },
  ElButton: buttonStub,
  ElAlert: { name: 'ElAlert', template: '<div><slot /></div>' },
  ElSkeleton: { name: 'ElSkeleton', template: '<div />' },
  RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' },
}
describe('ReportContributionDrawer', () => {
  it('shows signed refund, original purchase identity, all-record total, and next page action', async () => {
    const wrapper = mount(ReportContributionDrawer, { props: { modelValue: true, target: { label: 'Food' }, detail }, global: { plugins: [i18n], stubs } })
    expect(wrapper.text()).toContain('3.000,00')
    expect(wrapper.text()).toContain('-R$')
    expect(wrapper.text()).toContain('Compra #51')
    expect(wrapper.text()).toContain('Evento de crédito #99')
    expect(wrapper.findComponent({ name: 'RouterLink' }).props('to')).toEqual({ name: 'credit-card-statement-detail', params: { statement_id: 62 } })
    await wrapper.get('[data-test="report-load-more"]').trigger('click')
    expect(wrapper.emitted('load-more')).toHaveLength(1)
    await wrapper.get('[data-test="report-detail-close"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
  })
  it('links ordinary contributions to the existing transaction highlight route', () => {
    const ordinary = { ...row, source_kind: 'ordinary_transaction', source_id: 18, related_statement_id: null, related_purchase_id: null, related_credit_event_id: null }
    const wrapper = mount(ReportContributionDrawer, { props: { modelValue: true, target: { label: 'Income' }, detail: { ...detail, contributions: [ordinary], next_cursor: null } }, global: { plugins: [i18n], stubs } })
    expect(wrapper.findComponent({ name: 'RouterLink' }).props('to')).toEqual({ name: 'transactions', query: { highlight: 18 } })
  })
  it('links transfer contributions to the selected transfer record', () => {
    const transfer = { ...row, source_kind: 'transfer', source_id: 21, related_statement_id: null, related_purchase_id: null, related_credit_event_id: null }
    const wrapper = mount(ReportContributionDrawer, { props: { modelValue: true, target: { label: 'Transfer out' }, detail: { ...detail, contributions: [transfer], next_cursor: null } }, global: { plugins: [i18n], stubs } })
    expect(wrapper.findComponent({ name: 'RouterLink' }).props('to')).toEqual({ name: 'transfers', query: { highlight: 21 } })
  })
})
