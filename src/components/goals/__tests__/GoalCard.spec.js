import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import GoalCard from '../GoalCard.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })
const global = { plugins: [i18n], stubs: { RouterLink: { props: ['to'], template: '<a><slot /></a>' } } }
const base = { id: 1, name: 'Trip', status: 'active', target_centavos: 100000, allocated_centavos: 25000, remaining_centavos: 75000, excess_centavos: 0, progress_percentage: 25, target_date: null, target_date_state: null, financial_account: null, account_backing: 'unverified' }

describe('GoalCard', () => {
  it('leads with allocated money, then progress and target, and links to details', () => {
    const wrapper = mount(GoalCard, { global, props: { goal: base } })
    expect(wrapper.get('.goal-amount').text()).toContain('of')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('25')
    expect(wrapper.get('.goal-details').attributes('aria-label')).toContain('Trip')
    expect(wrapper.text()).not.toContain('Target date:')
  })

  it('keeps linked account shortfall separate from the goal allocation', () => {
    const wrapper = mount(GoalCard, { global, props: { goal: { ...base, account_backing: 'shortfall', financial_account: { name: 'Savings', shortfall_centavos: 30000 } } } })
    expect(wrapper.classes()).toContain('needs-attention')
    expect(wrapper.text()).toContain('Linked account is short by')
    expect(wrapper.text()).toMatch(/R\$\s*300\.00/)
  })

  it('shows completion date only when supplied and keeps archived cards readable', () => {
    const completed = mount(GoalCard, { global, props: { goal: { ...base, status: 'completed', completed_at: '2026-09-18T12:00:00Z' } } })
    expect(completed.text()).toContain('Completed on')
    const archived = mount(GoalCard, { global, props: { goal: { ...base, status: 'archived' } } })
    expect(archived.classes()).toContain('is-archived')
    expect(archived.get('.goal-details').exists()).toBe(true)
  })
})
