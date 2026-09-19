import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetPlanList from '../BudgetPlanList.vue'

const stubs = {
  ElButton: {
    name: 'ElButton',
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  BudgetPlanRow: true,
}

describe('BudgetPlanList', () => {
  it('keeps copy secondary and emits both section-header intents', async () => {
    const wrapper = mount(BudgetPlanList, { props: { plans: [] }, global: { stubs } })

    await wrapper.get('[data-test="budget-plan-copy"]').trigger('click')
    await wrapper.get('[data-test="budget-plan-add"]').trigger('click')

    expect(wrapper.emitted('copy')).toHaveLength(1)
    expect(wrapper.emitted('add')).toHaveLength(1)
  })
})
