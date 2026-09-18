import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ExpenseDistributionCard from '../ExpenseDistributionCard.vue'
import { dashboardDistributionFixture } from '@/services/__tests__/fixtures/dashboardFixtures'

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
  BaseChart: {
    name: 'BaseChart',
    props: ['label'],
    template: '<div role="img" :aria-label="label" />',
  },
}

function mountCard(props = {}) {
  return mount(ExpenseDistributionCard, {
    props: { distribution: dashboardDistributionFixture(), ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('ExpenseDistributionCard', () => {
  it('shows realized category values as text alongside the donut chart', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="dashboard-distribution-total"]').text()).toContain('1.200,00')

    const rows = wrapper.findAll('[data-test="dashboard-distribution-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].get('[data-test="dashboard-distribution-share"]').text()).toContain('75%')
    expect(rows[0].get('[data-test="dashboard-distribution-amount"]').text()).toContain('900,00')
    expect(rows[1].get('[data-test="dashboard-distribution-share"]').text()).toContain('25%')
    expect(rows[1].text()).toContain('Arquivada')
  })

  it('exposes the visualisation with a label and a textual category breakdown', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="dashboard-distribution-chart"] [role="img"]').attributes('aria-label')).toBe(
      'Gráfico de rosca das despesas realizadas por categoria no período selecionado.',
    )
    expect(wrapper.get('.category-breakdown').text()).toContain('Detalhamento por categoria')
  })

  it('explains a period without realized expenses', () => {
    const wrapper = mountCard({
      distribution: {
        ...dashboardDistributionFixture(),
        total_expenses: { amount_centavos: 0, currency_code: 'BRL' },
        categories: [],
      },
    })

    expect(wrapper.get('[data-test="dashboard-distribution-empty"]').text()).toBe(
      'Nenhuma despesa realizada neste período.',
    )
  })

  it('offers an independent retry when the section fails', async () => {
    const wrapper = mountCard({ distribution: null, error: new Error('boom') })

    expect(wrapper.get('[data-test="dashboard-distribution-error"]').text()).toContain(
      'Não foi possível carregar as despesas por categoria.',
    )

    await wrapper.get('[data-test="dashboard-distribution-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
