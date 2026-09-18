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
    expect(rows[0].get('[data-test="dashboard-recent-category"]').text()).toBe('Mercado')
    expect(rows[1].text()).toContain('Transferência')
    expect(rows[1].get('[data-test="dashboard-recent-account"]').text()).toBe(
      'Conta corrente → Poupança',
    )
    expect(rows[1].get('[data-test="dashboard-recent-status"]').text()).toBe('Pendente')
    expect(rows[1].get('[data-test="dashboard-recent-status"] .tag').attributes('data-type')).toBe(
      'warning',
    )
    expect(rows[2].get('[data-test="dashboard-recent-recurrence"]').text()).toBe('Recorrência #5')
    expect(
      wrapper.get('[data-test="dashboard-recent-table-scroll"]').get('.recent-table').exists(),
    ).toBe(true)
  })

  it('states the ten item scope and links to full financial history', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('Até 10 movimentos mais recentes.')
    expect(wrapper.get('[data-test="dashboard-recent-history"]').text()).toBe(
      'Ver histórico financeiro',
    )
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
