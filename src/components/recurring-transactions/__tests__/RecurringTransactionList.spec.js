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

  it('shows description, account, category, and signed amount in separate columns', async () => {
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
    expect(amount.classes()).toContain('expense')

    expect(wrapper.findAll('thead th').map((header) => header.text().trim())).toEqual([
      'Descrição',
      'Destino',
      'Categoria',
      'Frequência',
      'Próxima',
      'Situação',
      'Valor',
      '',
    ])
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

  it('uses a plus sign for income amounts', async () => {
    const wrapper = await factory([rule({ type: 'income', amount_centavos: 3000 })])
    const amount = wrapper.find('[data-test="recurrence-amount"]')

    expect(amount.text()).toContain('+ R$')
    expect(amount.text()).toContain('30,00')
    expect(amount.text()).not.toContain('Receita')
    expect(amount.classes()).toContain('income')
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
