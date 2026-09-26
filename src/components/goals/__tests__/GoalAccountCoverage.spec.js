import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import GoalAccountCoverage from '../GoalAccountCoverage.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })

describe('GoalAccountCoverage', () => {
  it('shows actual, designated, negative unallocated and explicit shortfall text', () => {
    const goal = { account_backing: 'shortfall', financial_account: { id: 1, name: 'Savings', status: 'active', current_balance_centavos: 4000, designated_centavos: 8000, unallocated_centavos: -4000, shortfall_centavos: 4000 } }
    const wrapper = mount(GoalAccountCoverage, { global: { plugins: [i18n] }, props: { goal } })
    expect(wrapper.text()).toContain('Actual balance')
    expect(wrapper.text()).toContain('Designated to goals')
    expect(wrapper.text()).toContain('Unallocated')
    expect(wrapper.text()).toContain('short by')
    expect(wrapper.text()).toContain('Release money')
  })

  it('keeps unavailable balance unknown and labels unlinked designations unverified', () => {
    const unavailable = mount(GoalAccountCoverage, { global: { plugins: [i18n] }, props: { goal: { account_backing: 'inactive_or_unavailable', financial_account: { id: 1, name: 'Old', status: 'unavailable', current_balance_centavos: null, designated_centavos: 50, unallocated_centavos: null, shortfall_centavos: null } } } })
    expect(unavailable.text()).toContain('Unavailable')
    expect(unavailable.text()).not.toContain('R$ 0.00')
    const unlinked = mount(GoalAccountCoverage, { global: { plugins: [i18n] }, props: { goal: { account_backing: 'unverified', financial_account: null } } })
    expect(unlinked.text()).toContain('cannot be verified')
  })
})
