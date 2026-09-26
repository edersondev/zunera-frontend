import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import GoalProgressSummary from '../GoalProgressSummary.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })
const base = { status: 'active', allocated_centavos: 0, target_centavos: 100000, remaining_centavos: 100000, excess_centavos: 0, progress_percentage: 0, account_backing: 'available', target_date_state: null }
const mountGoal = (goal) => mount(GoalProgressSummary, { global: { plugins: [i18n] }, props: { goal: { ...base, ...goal } } })

describe('GoalProgressSummary', () => {
  it('uses authoritative progress at zero and for a tiny non-zero allocation', () => {
    const zero = mountGoal({})
    expect(zero.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0')
    const tiny = mountGoal({ allocated_centavos: 30, remaining_centavos: 99970, progress_percentage: 0.03 })
    expect(tiny.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0.03')
    expect(tiny.text()).toContain('0.03%')
    expect(tiny.find('.goal-progress-marker').exists()).toBe(true)
    expect(tiny.text()).not.toContain('Needs attention')
  })

  it('shows completed and shortage context without changing the goal amount', () => {
    const completed = mountGoal({ status: 'completed', allocated_centavos: 100000, remaining_centavos: 0, progress_percentage: 100, completed_at: '2026-09-18T12:00:00Z' })
    expect(completed.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(completed.text()).toContain('Completed on')
    const shortage = mountGoal({ allocated_centavos: 50000, remaining_centavos: 50000, progress_percentage: 50, account_backing: 'shortfall', financial_account: { shortfall_centavos: 30000 } })
    expect(shortage.text()).toContain('Linked account shortfall')
  })
})
