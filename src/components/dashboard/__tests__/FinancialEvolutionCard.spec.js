import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import FinancialEvolutionCard from '../FinancialEvolutionCard.vue'
import { dashboardEvolutionFixture } from '@/services/__tests__/fixtures/dashboardFixtures'

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
  ElTag: { name: 'ElTag', template: '<span class="tag"><slot /></span>' },
}

function mountCard(props = {}) {
  return mount(FinancialEvolutionCard, {
    props: { evolution: dashboardEvolutionFixture(), ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('FinancialEvolutionCard', () => {
  it('names the interval scope and renders realized values per interval', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="dashboard-evolution-interval"]').text()).toBe(
      'Intervalo: Diário',
    )

    const rows = wrapper.findAll('[data-test="dashboard-evolution-row"]')
    expect(rows).toHaveLength(2)
    expect(
      wrapper
        .get('[data-test="dashboard-evolution-table-scroll"]')
        .get('.evolution-table')
        .exists(),
    ).toBe(true)
    expect(rows[0].get('[data-test="dashboard-evolution-income"]').text()).toContain('3.200,00')
    expect(rows[0].get('[data-test="dashboard-evolution-result"]').text()).toContain('3.200,00')
    expect(rows[1].get('[data-test="dashboard-evolution-expenses"]').text()).toContain('1.200,00')
    expect(rows[1].get('[data-test="dashboard-evolution-result"]').text()).toContain('1.200,00')
    expect(rows[1].get('[data-test="dashboard-evolution-result"]').classes()).toContain(
      'result-negative',
    )
  })

  it('marks clipped boundary intervals instead of comparing them as complete', () => {
    const wrapper = mountCard()
    const partials = wrapper.findAll('[data-test="dashboard-evolution-partial"]')

    expect(partials).toHaveLength(1)
    expect(partials[0].text()).toBe('Período parcial')
  })

  it('keeps weekly and monthly interval labels translatable', () => {
    const wrapper = mountCard({
      evolution: { ...dashboardEvolutionFixture(), interval: 'monthly' },
    })

    expect(wrapper.get('[data-test="dashboard-evolution-interval"]').text()).toBe(
      'Intervalo: Mensal',
    )
  })

  it('shows an empty state when the period has no realized movement', () => {
    const wrapper = mountCard({
      evolution: { ...dashboardEvolutionFixture(), intervals: [] },
    })

    expect(wrapper.get('[data-test="dashboard-evolution-empty"]').text()).toBe(
      'Nenhum movimento realizado neste período.',
    )
  })

  it('retries independently after a section failure', async () => {
    const wrapper = mountCard({ evolution: null, error: new Error('boom') })

    expect(wrapper.get('[data-test="dashboard-evolution-error"]').text()).toContain(
      'Não foi possível carregar a evolução financeira.',
    )

    await wrapper.get('[data-test="dashboard-evolution-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
