import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RecentActivityCard from '../RecentActivityCard.vue'
import { dashboardRecentActivityFixture } from '@/services/__tests__/fixtures/dashboardFixtures'

const stubs = {
  ElAlert: {
    name: 'ElAlert',
    props: ['title'],
    template: '<div role="alert"><p>{{ title }}</p><slot /></div>',
  },
  ElButton: {
    name: 'ElButton',
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  ElSkeleton: { name: 'ElSkeleton', template: '<div class="skeleton" />' },
  ElTag: {
    name: 'ElTag',
    props: ['type'],
    template: '<span class="tag" :data-type="type"><slot /></span>',
  },
  RouterLink: {
    name: 'RouterLink',
    props: ['to'],
    template: '<a :href="JSON.stringify(to)"><slot /></a>',
  },
}

function mountCard(props = {}) {
  return mount(RecentActivityCard, {
    props: { items: dashboardRecentActivityFixture(), ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('RecentActivityCard', () => {
  it('labels income, expense, transfer, and pending activity with values and dates', () => {
    const wrapper = mountCard()
    const rows = wrapper.findAll('[data-test="dashboard-recent-row"]')

    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('Despesa')
    expect(rows[0].get('[data-test="dashboard-recent-amount"]').text()).toContain('450,00')
    expect(rows[0].get('[data-test="dashboard-recent-amount"]').classes()).toContain(
      'financial-negative',
    )
    expect(rows[0].get('[data-test="dashboard-recent-category"]').text()).toBe('Mercado')
    expect(rows[1].text()).toContain('Transferência')
    expect(rows[1].get('[data-test="dashboard-recent-account"]').text()).toBe(
      'Conta corrente → Poupança',
    )
    expect(rows[1].get('[data-test="dashboard-recent-status"]').text()).toContain('Pendente')
    expect(rows[1].get('[data-test="dashboard-recent-status"] .tag').attributes('data-type')).toBe(
      'warning',
    )
    expect(rows[1].get('[data-test="dashboard-recent-amount"]').classes()).not.toContain(
      'financial-positive',
    )
    expect(rows[1].get('[data-test="dashboard-recent-amount"]').classes()).not.toContain(
      'financial-negative',
    )
    expect(rows[2].get('[data-test="dashboard-recent-recurrence"]').text()).toBe('Recorrência #5')
    expect(rows[2].get('[data-test="dashboard-recent-amount"]').classes()).toContain(
      'financial-positive',
    )
    expect(wrapper.get('[data-test="dashboard-recent-list"]').exists()).toBe(true)
  })

  it('states the ten item scope and links to full financial history', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('Até 10 movimentos mais recentes.')
    expect(wrapper.get('[data-test="dashboard-recent-history"]').text()).toBe(
      'Ver histórico financeiro',
    )
  })

  it('labels a recorded card purchase and links its recurrence source', () => {
    const wrapper = mountCard({ items: [{
      id: 7,
      movement_kind: 'credit_card_expense',
      movement_date: '2026-09-01',
      amount: { amount_centavos: 15_000, currency_code: 'BRL' },
      status: 'effective',
      description: 'Academia',
      credit_card: { id: 3, name: 'Nubank', institution_name: 'Nubank', last_four: '3450', status: 'active' },
      category: { id: 8, name: 'Academia' },
      recurrence_source: { id: 12, scheduled_date: '2026-09-01' },
    }] })

    expect(wrapper.get('[data-test="dashboard-recent-row"]').text()).toContain('Compra no cartão')
    expect(wrapper.get('[data-test="dashboard-recent-account"]').text()).toContain('Nubank •••• 3450')
    expect(wrapper.get('[data-test="dashboard-recent-amount"]').classes()).toContain('financial-negative')
    expect(wrapper.get('[data-test="dashboard-recent-recurrence"]').attributes('href')).toContain('"highlight":12')
  })

  it('asks the backend for at most ten movements instead of trimming silently', () => {
    const items = Array.from({ length: 10 }, (_, index) => ({
      ...dashboardRecentActivityFixture()[0],
      id: index + 1,
    }))
    const wrapper = mountCard({ items })

    expect(wrapper.findAll('[data-test="dashboard-recent-row"]')).toHaveLength(10)
  })

  it('shows empty and error states with independent recovery', async () => {
    const empty = mountCard({ items: [] })
    expect(empty.get('[data-test="dashboard-recent-empty"]').text()).toBe(
      'Nenhuma atividade registrada ainda.',
    )

    const failed = mountCard({ items: null, error: new Error('boom') })
    expect(failed.get('[data-test="dashboard-recent-error"]').text()).toContain(
      'Não foi possível carregar a atividade recente.',
    )

    await failed.get('[data-test="dashboard-recent-retry"]').trigger('click')
    expect(failed.emitted('retry')).toHaveLength(1)
  })
})
