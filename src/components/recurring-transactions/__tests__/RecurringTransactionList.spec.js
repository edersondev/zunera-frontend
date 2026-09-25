import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { nextTick } from 'vue'
import { i18n } from '@/i18n'
import RecurringTransactionList from '../RecurringTransactionList.vue'

const stubs = {}

function rule(overrides = {}) {
  return {
    id: 1,
    description: 'Aluguel',
    type: 'expense',
    frequency: 'monthly',
    state: 'active',
    paused_reason: null,
    amount_centavos: 120000,
    next_expected_occurrence: '2026-10-05',
    financial_account: { id: 1, name: 'Conta', status: 'active' },
    category: { id: 2, name: 'Moradia', status: 'active' },
    ...overrides,
  }
}

async function factory(rules, props = {}) {
  const wrapper = mount(RecurringTransactionList, {
    props: { rules, ...props },
    global: { plugins: [i18n, ElementPlus], stubs },
  })

  await nextTick()
  await nextTick()

  return wrapper
}

describe('RecurringTransactionList', () => {
  it('shows the empty state when nothing matches', async () => {
    const wrapper = await factory([])

    expect(wrapper.text()).toContain('Nenhuma recorrência encontrada.')
  })

  it('shows description, destination, category, state, and signed amount in a compact item', async () => {
    const wrapper = await factory([rule()])

    const text = wrapper.text()
    expect(text).toContain('Aluguel')
    expect(wrapper.find('[data-test="recurrence-destination"]').text()).toBe('Conta')
    expect(wrapper.find('[data-test="recurrence-category"]').text()).toBe('Moradia')
    expect(text).toContain('Ativa')
    expect(text).toMatch(/05\/10\/2026/)
    const amount = wrapper.find('[data-test="recurrence-amount"]')

    expect(amount.text()).toContain('− R$')
    expect(amount.text()).toContain('1.200,00')
    expect(amount.text()).not.toContain('Despesa')
    expect(amount.classes()).toContain('text-[var(--color-financial-negative)]')
    expect(wrapper.findAll('thead th')).toHaveLength(0)
    expect(wrapper.find('[data-test="recurrence-toggle"]').attributes('aria-expanded')).toBe('false')
  })

  it('shows card identity for a credit-card destination', async () => {
    const wrapper = await factory([
      rule({
        destination_type: 'credit_card',
        financial_account: null,
        credit_card: { id: 3, name: 'Nubank', institution_name: 'Nubank', last_four: '3450', status: 'active' },
      }),
    ])

    expect(wrapper.find('[data-test="recurrence-destination"]').text()).toBe('Nubank •••• 3450')
  })

  it('gives only reviewable items a subtle accent and a direct action', async () => {
    const wrapper = await factory([
      rule({ id: 1, reviewable_occurrence_count: 1 }),
      rule({ id: 2, description: 'Internet', reviewable_occurrence_count: 0 }),
    ])
    const rows = wrapper.findAll('[data-test="recurrence-item"]')

    expect(rows[0].classes()).toContain('border-l-[var(--color-warning)]')
    expect(rows[0].get('[data-test="recurrence-needs-review"]').text()).toBe('Revisão necessária')
    await rows[0].get('[data-test="recurrence-review"]').trigger('click')
    expect(wrapper.emitted('review')[0][0].id).toBe(1)
    expect(rows[1].classes()).toContain('border-l-transparent')
    expect(rows[1].find('[data-test="recurrence-needs-review"]').exists()).toBe(false)
  })

  it('uses a plus sign for income amounts', async () => {
    const wrapper = await factory([rule({ type: 'income', amount_centavos: 3000 })])
    const amount = wrapper.find('[data-test="recurrence-amount"]')

    expect(amount.text()).toContain('+ R$')
    expect(amount.text()).toContain('30,00')
    expect(amount.text()).not.toContain('Receita')
    expect(amount.classes()).toContain('text-[var(--color-financial-positive)]')
  })

  it('keeps inline details and occurrence history separate', async () => {
    const wrapper = await factory([rule({ reviewable_occurrence_count: 2, destination_type: 'credit_card',
      financial_account: null, credit_card: { id: 3, name: 'Nubank', last_four: '3450' }, generation_mode: 'confirmation' })], {
      expandedRuleId: 1,
      reviewPreview: { id: 12, state: 'expected', scheduled_date: '2026-10-05', scheduled_amount_centavos: 11900 },
    })
    const toggle = wrapper.get('[data-test="recurrence-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-test="recurrence-expanded"]').attributes('role')).toBe('region')
    expect(wrapper.get('[data-test="recurrence-review-preview"]').text()).toContain('119,00')
    await toggle.trigger('click')
    expect(wrapper.emitted('toggle')[0][0].id).toBe(1)
    await wrapper.get('[data-test="recurrence-expanded"] button').trigger('click')
    expect(wrapper.emitted('view-history')[0][0].id).toBe(1)
  })

  it('explains an archived association without a titled actions column', async () => {
    const paused = await factory([
      rule({
        state: 'paused',
        paused_reason: 'association_archived',
        next_expected_occurrence: null,
      }),
      rule({ id: 2, state: 'ended' }),
    ])

    const text = paused.text()
    expect(text).toContain('Pausada por conta ou categoria arquivada')
    expect(text).toContain('Reassocie uma conta e categoria ativas antes de retomar.')
    expect(text).toContain('Encerrada')
    expect(text).not.toContain('Ações')
  })

  it('emits load-more only when another page exists', async () => {
    const wrapper = await factory([rule()], { hasMore: true })

    await wrapper.find('[data-test="recurrence-load-more"]').trigger('click')
    expect(wrapper.emitted('load-more')).toHaveLength(1)
  })
})
