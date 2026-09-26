import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import GoalDateGuidance from '../GoalDateGuidance.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })

describe('GoalDateGuidance', () => {
  it('renders backend suggestion as guidance with no automatic contribution', () => {
    const wrapper = mount(GoalDateGuidance, { global: { plugins: [i18n] }, props: { goal: { target_date: '2027-09-25', target_date_state: 'future', suggested_monthly_centavos: 100000, contribution_periods_remaining: 12 } } })
    expect(wrapper.text()).toContain('Suggestion:')
    expect(wrapper.text()).toContain('12 months')
    expect(wrapper.text()).toContain('No automatic transfer')
  })
  it('shows overdue state without a suggestion', () => {
    const wrapper = mount(GoalDateGuidance, { global: { plugins: [i18n] }, props: { goal: { target_date: '2026-01-01', target_date_state: 'overdue', suggested_monthly_centavos: null } } })
    expect(wrapper.text()).toContain('Overdue')
    expect(wrapper.text()).not.toContain('Suggestion:')
  })
})
