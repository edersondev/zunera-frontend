import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetPlanRow from '../BudgetPlanRow.vue'

const stubs = {
  ElButton: {
    name: 'ElButton',
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  ElTag: { name: 'ElTag', template: '<span class="tag"><slot /></span>' },
}

function money(amountCentavos) {
  return { amount_centavos: amountCentavos, currency_code: 'BRL' }
}

function plan(overrides = {}) {
  return {
    id: 11,
    category: {
      id: 3,
      name: 'Mercado',
      classification: 'expense',
      origin: 'personal',
      status: 'active',
      color: 'teal',
      icon: 'circle',
    },
    planned: money(100_000),
    realized: money(72_000),
    available: money(28_000),
    utilization_percent: 72,
    status: 'within',
    excess: money(0),
    expected: null,
    projected_spending: null,
    projected_available: null,
    projected_status: null,
    is_read_only: false,
    ...overrides,
  }
}

function mountRow(overrides = {}) {
  return mount(BudgetPlanRow, { props: { plan: plan(overrides) }, global: { stubs } })
}

describe('BudgetPlanRow', () => {
  it('shows textual status and money values without relying on colour', () => {
    const wrapper = mountRow()

    expect(wrapper.get('[data-test="budget-plan-name"]').text()).toBe('Mercado')
    expect(wrapper.get('[data-test="budget-plan-realized"]').text()).toContain('720,00')
    expect(wrapper.get('[data-test="budget-plan-status"]').text()).toBe('Dentro do orçamento')
    expect(wrapper.find('[data-test="budget-plan-excess"]').exists()).toBe(false)
  })

  it('identifies an exceeded plan with words and the excess amount', () => {
    const wrapper = mountRow({
      realized: money(107_000),
      available: money(-7_000),
      utilization_percent: 107,
      status: 'exceeded',
      excess: money(7_000),
    })

    expect(wrapper.get('[data-test="budget-plan-status"]').text()).toBe('Orçamento excedido')
    expect(wrapper.get('[data-test="budget-plan-excess"]').text()).toContain('70,00')
  })

  it('labels projections separately from realized spending', () => {
    const wrapper = mountRow({
      expected: money(20_000),
      projected_spending: money(92_000),
      projected_available: money(8_000),
      projected_status: 'approaching',
    })

    expect(wrapper.get('[data-test="budget-plan-projection"]').text()).toContain('920,00')
    expect(wrapper.get('[data-test="budget-plan-realized"]').text()).toContain('720,00')
  })

  it('keeps archived plans read-only with no edit or removal affordances', () => {
    const wrapper = mountRow({
      is_read_only: true,
      category: {
        id: 3,
        name: 'Mercado',
        classification: 'expense',
        origin: 'personal',
        status: 'archived',
        color: 'teal',
        icon: 'circle',
      },
    })

    expect(wrapper.text()).toContain('Arquivada')
    expect(wrapper.text()).toContain('somente leitura')
    expect(wrapper.find('[data-test="budget-plan-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="budget-plan-remove"]').exists()).toBe(false)
  })

  it('emits edit and remove intents for mutable plans', async () => {
    const wrapper = mountRow()

    await wrapper.get('[data-test="budget-plan-edit"]').trigger('click')
    await wrapper.get('[data-test="budget-plan-remove"]').trigger('click')

    expect(wrapper.emitted('edit')[0][0].id).toBe(11)
    expect(wrapper.emitted('remove')[0][0].id).toBe(11)
  })
})
