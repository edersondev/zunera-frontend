import { describe, expect, it } from 'vitest'
import { DocumentCopy, Plus } from '@element-plus/icons-vue'
import { mount } from '@vue/test-utils'
import BudgetEmptyState from '../BudgetEmptyState.vue'
import BudgetPlanList from '../BudgetPlanList.vue'

const stubs = {
  ElButton: {
    name: 'ElButton',
    props: ['icon'],
    template: '<button><slot /></button>',
  },
  BudgetPlanRow: true,
}

function iconFor(wrapper, dataTest) {
  return wrapper
    .findAllComponents({ name: 'ElButton' })
    .find((button) => button.attributes('data-test') === dataTest)
    ?.props('icon')
}

describe('Budget add category actions', () => {
  it('uses a plus icon in the planned category list', () => {
    const wrapper = mount(BudgetPlanList, { props: { plans: [] }, global: { stubs } })

    expect(iconFor(wrapper, 'budget-plan-add')).toBe(Plus)
  })

  it('uses a plus icon in the no-plans empty state', () => {
    const wrapper = mount(BudgetEmptyState, {
      props: { state: 'no-plans' },
      global: { stubs },
    })

    expect(iconFor(wrapper, 'budget-empty-add')).toBe(Plus)
  })

  it('uses icons for create and copy budget actions', () => {
    const wrapper = mount(BudgetEmptyState, {
      props: { state: 'no-budget', canCopy: true },
      global: { stubs },
    })

    expect(iconFor(wrapper, 'budget-empty-create')).toBe(Plus)
    expect(iconFor(wrapper, 'budget-empty-copy')).toBe(DocumentCopy)
  })
})
