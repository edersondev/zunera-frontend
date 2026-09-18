import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetMonthNavigator from '../BudgetMonthNavigator.vue'

const stubs = {
  ElButton: {
    name: 'ElButton',
    props: ['disabled', 'ariaLabel'],
    emits: ['click'],
    template: '<button :disabled="disabled" :aria-label="ariaLabel" @click="$emit(\'click\')"><slot /></button>',
  },
  ElIcon: { name: 'ElIcon', template: '<span><slot /></span>' },
}

function mountNavigator(month) {
  return mount(BudgetMonthNavigator, {
    props: { month },
    global: { stubs },
  })
}

describe('BudgetMonthNavigator', () => {
  it('shows the selected calendar month and emits the previous month', async () => {
    const wrapper = mountNavigator({ year: 2026, month: 1 })

    expect(wrapper.get('[data-test="budget-month-label"]').text()).toBe('janeiro de 2026')

    await wrapper.get('[data-test="budget-month-previous"]').trigger('click')

    expect(wrapper.emitted('change-month')).toEqual([[{ year: 2025, month: 12 }]])
  })

  it('emits the next month across a year boundary', async () => {
    const wrapper = mountNavigator({ year: 2026, month: 12 })

    await wrapper.get('[data-test="budget-month-next"]').trigger('click')

    expect(wrapper.emitted('change-month')).toEqual([[{ year: 2027, month: 1 }]])
  })

  it('disables navigation while the month is loading', async () => {
    const wrapper = mount(BudgetMonthNavigator, {
      props: { month: { year: 2026, month: 9 }, loading: true },
      global: { stubs },
    })

    await wrapper.get('[data-test="budget-month-next"]').trigger('click')

    expect(wrapper.emitted('change-month')).toBeUndefined()
  })
})
