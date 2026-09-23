import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { i18n } from '@/i18n'
import CreditCardStatementLineItems from '../CreditCardStatementLineItems.vue'

const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })
const installment = (id, overrides = {}) => ({
  id,
  purchase_id: id + 100,
  description: `Purchase ${id}`,
  purchase_date: '2026-09-21',
  sequence: 1,
  total_count: 2,
  amount: money(30_000),
  credit_adjustment: money(5_000),
  recognized_amount: money(25_000),
  purchase_total_amount: money(60_000),
  recognition_status: 'effective',
  is_directly_editable: true,
  category: { id: 18, name: 'Groceries', icon: 'shopping_bag', color: 'teal' },
  ...overrides,
})

const stubs = {
  ElEmpty: { props: ['description'], template: '<p>{{ description }}</p>' },
  ElIcon: { template: '<span><slot /></span>' },
  ElTag: { template: '<span><slot /></span>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\', $event)"><slot /></button>' },
}

function factory(installments = [installment(301), installment(302)]) {
  return mount(CreditCardStatementLineItems, {
    props: {
      installments,
      statementAmountCentavos: 55_000,
      card: { institution_name: 'C6 Bank', last_four: '3450' },
      statement: { closing_date: '2026-10-25', period_from: '2026-09-26', period_to: '2026-10-25' },
    },
    global: { plugins: [i18n], stubs },
  })
}

describe('CreditCardStatementLineItems', () => {
  it('renders every installment once and keeps authoritative amounts separate', async () => {
    const wrapper = factory()
    expect(wrapper.findAll('[data-test^="credit-card-line-"][class="transaction-item"]')).toHaveLength(2)

    const first = wrapper.get('[data-test="credit-card-line-301"]')
    expect(first.text()).toContain('Purchase 301')
    expect(first.text()).toContain('Groceries')
    expect(first.text()).toContain('300,00')
    expect(first.text()).toContain('1/2')
    expect(first.text()).toContain('Reconhecido')

    await wrapper.get('[data-test="credit-card-line-toggle-301"]').trigger('click')
    const details = wrapper.get('[data-test="credit-card-line-details-301"]')
    expect(details.text()).toContain('600,00')
    expect(details.text()).toContain('50,00')
    expect(details.text()).toContain('250,00')
    expect(details.text()).toContain('C6 Bank •••• 3450')
    expect(details.text()).toContain('outubro de 2026')
    expect(details.text()).toContain('26/09/2026')
  })

  it('keeps only one item open and clears removed expansion', async () => {
    const wrapper = factory()
    const first = wrapper.get('[data-test="credit-card-line-toggle-301"]')
    expect(first.attributes('aria-expanded')).toBe('false')
    expect(first.element.tagName).toBe('BUTTON')

    await first.trigger('click')
    expect(first.attributes('aria-expanded')).toBe('true')
    expect(first.attributes('aria-controls')).toBe('statement-line-details-301')
    await wrapper.get('[data-test="credit-card-line-toggle-302"]').trigger('click')
    expect(first.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('[data-test="credit-card-line-details-301"]').isVisible()).toBe(false)
    expect(wrapper.find('[data-test="credit-card-line-details-302"]').exists()).toBe(true)

    await wrapper.setProps({ installments: [installment(301)] })
    await nextTick()
    expect(wrapper.get('[role="region"]').isVisible()).toBe(false)
  })

  it('emits existing action intent without toggling and hides ineligible correction', async () => {
    const wrapper = factory([installment(301)])
    await wrapper.get('[data-test="credit-card-line-toggle-301"]').trigger('click')
    await wrapper.get('[data-test="credit-card-line-correct-301"]').trigger('click')
    await wrapper.get('[data-test="credit-card-line-refund-301"]').trigger('click')
    expect(wrapper.emitted('correct')).toHaveLength(1)
    expect(wrapper.emitted('refund')).toHaveLength(1)
    expect(wrapper.get('[data-test="credit-card-line-toggle-301"]').attributes('aria-expanded')).toBe('true')

    await wrapper.setProps({ installments: [installment(301, { is_directly_editable: false })] })
    expect(wrapper.find('[data-test="credit-card-line-correct-301"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="credit-card-line-refund-301"]').exists()).toBe(true)
  })

  it('omits unavailable optional fields and retains empty state', async () => {
    const wrapper = factory([installment(301, {
      category: null,
      purchase_total_amount: null,
      credit_adjustment: null,
      recognized_amount: null,
      recognition_status: null,
    })])
    await wrapper.get('[data-test="credit-card-line-toggle-301"]').trigger('click')
    const details = wrapper.get('[data-test="credit-card-line-details-301"]')
    expect(details.text()).not.toContain('Categoria')
    expect(details.text()).not.toContain('Valor total da compra')
    expect(details.text()).not.toContain('Valor líquido da parcela')

    await wrapper.setProps({ installments: [] })
    expect(wrapper.text()).toContain('Nenhuma fatura registrada')
    expect(wrapper.find('[role="region"]').exists()).toBe(false)
  })
})
