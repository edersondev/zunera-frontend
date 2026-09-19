import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BudgetProgressBar from '../BudgetProgressBar.vue'

describe('BudgetProgressBar', () => {
  it('caps visual progress while exposing the exact utilization in accessible text', () => {
    const wrapper = mount(BudgetProgressBar, {
      props: {
        value: 107.25,
        valueText: '107,25%',
        label: 'Progresso do orçamento',
        status: 'exceeded',
      },
    })

    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuetext')).toBe('107,25%')
    expect(wrapper.get('.budget-progress-bar').attributes('style')).toContain('width: 100%')
  })

  it('does not render a progress indicator when utilization is unavailable', () => {
    const wrapper = mount(BudgetProgressBar, {
      props: { value: null, valueText: 'Não aplicável', label: 'Progresso do orçamento' },
    })

    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })
})
