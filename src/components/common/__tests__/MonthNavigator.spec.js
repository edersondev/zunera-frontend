import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MonthNavigator from '../MonthNavigator.vue'
import { i18n } from '@/i18n'

const stubs = {
  ElButton: {
    name: 'ElButton',
    props: ['disabled', 'ariaLabel'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" :aria-label="ariaLabel" @click="$emit(\'click\')"><slot /></button>',
  },
  ElIcon: { name: 'ElIcon', template: '<span><slot /></span>' },
}

function mountNavigator(month, loading = false) {
  return mount(MonthNavigator, {
    props: { month, loading },
    global: { plugins: [i18n], stubs },
  })
}

describe('MonthNavigator', () => {
  it('shows the selected calendar month and emits the previous month', async () => {
    i18n.global.locale.value = 'pt-BR'
    const wrapper = mountNavigator({ year: 2026, month: 1 })

    expect(wrapper.get('[data-test="month-label"]').text()).toBe('janeiro de 2026')

    await wrapper.get('[data-test="month-previous"]').trigger('click')

    expect(wrapper.emitted('change-month')).toEqual([[{ year: 2025, month: 12 }]])
  })

  it('emits the next month across a year boundary', async () => {
    const wrapper = mountNavigator({ year: 2026, month: 12 })

    await wrapper.get('[data-test="month-next"]').trigger('click')

    expect(wrapper.emitted('change-month')).toEqual([[{ year: 2027, month: 1 }]])
  })

  it('disables navigation while the month is loading', async () => {
    const wrapper = mountNavigator({ year: 2026, month: 9 }, true)

    await wrapper.get('[data-test="month-next"]').trigger('click')

    expect(wrapper.emitted('change-month')).toBeUndefined()
  })

  it('localizes the arrow labels', () => {
    i18n.global.locale.value = 'en'
    const wrapper = mountNavigator({ year: 2026, month: 9 })

    expect(wrapper.get('[data-test="month-previous"]').attributes('aria-label')).toBe(
      'Previous month',
    )
    expect(wrapper.get('[data-test="month-next"]').attributes('aria-label')).toBe('Next month')
    expect(wrapper.get('[data-test="month-label"]').text()).toBe('September 2026')
    i18n.global.locale.value = 'pt-BR'
  })
})
