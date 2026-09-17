import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import UpcomingActivityCard from '../UpcomingActivityCard.vue'
import { dashboardUpcomingActivityFixture } from '@/services/__tests__/fixtures/dashboardFixtures'

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
}

function mountCard(props = {}) {
  return mount(UpcomingActivityCard, {
    props: { upcoming: dashboardUpcomingActivityFixture(), ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('UpcomingActivityCard', () => {
  it('presents dated expected movements once, with the 30 day horizon', () => {
    const wrapper = mountCard()
    const rows = wrapper.findAll('[data-test="dashboard-upcoming-row"]')

    expect(rows).toHaveLength(2)
    expect(wrapper.get('[data-test="dashboard-upcoming-horizon"]').text()).toContain(
      '17 de set. de 2026',
    )
    expect(rows[0].get('[data-test="dashboard-upcoming-source"]').text()).toBe('Transação pendente')
    expect(rows[0].get('[data-test="dashboard-upcoming-amount"]').text()).toContain('215,00')
    expect(rows[1].get('[data-test="dashboard-upcoming-source"]').text()).toBe('Recorrência')
    expect(rows[1].get('[data-test="dashboard-upcoming-amount"]').text()).toContain('2.500,00')
  })

  it('never lets expected values read as realized results', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="dashboard-upcoming-note"]').text()).toBe(
      'Valores esperados não entram no resultado realizado.',
    )
  })

  it('explains an empty horizon and recovers independently from failure', async () => {
    const empty = mountCard({
      upcoming: { items: [], meta: { from: '2026-09-17', to: '2026-10-16' } },
    })
    expect(empty.get('[data-test="dashboard-upcoming-empty"]').text()).toBe(
      'Nenhuma atividade esperada nos próximos 30 dias.',
    )

    const failed = mountCard({ upcoming: null, error: new Error('boom') })
    await failed.get('[data-test="dashboard-upcoming-retry"]').trigger('click')

    expect(failed.emitted('retry')).toHaveLength(1)
  })
})
