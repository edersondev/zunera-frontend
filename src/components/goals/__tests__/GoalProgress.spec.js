import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import GoalProgress from '../GoalProgress.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })

describe('GoalProgress', () => {
  it('keeps tiny nonzero progress truthful in text and proportional fill', () => {
    const wrapper = mount(GoalProgress, { global: { plugins: [i18n] }, props: { goal: { target_centavos: 1_000_000, allocated_centavos: 1, excess_centavos: 0, progress_percentage: 0.0001 }, showAmounts: false } })
    expect(wrapper.text()).toContain('<0.01%')
    expect(wrapper.get('.goal-progress-fill').attributes('style')).toContain('width: 0.0001%')
    expect(wrapper.get('.goal-progress-marker').attributes('aria-hidden')).toBe('true')
  })
  it('caps only visual fill while announcing actual overfunding and excess', () => {
    const wrapper = mount(GoalProgress, { global: { plugins: [i18n] }, props: { goal: { target_centavos: 100, allocated_centavos: 125, excess_centavos: 25, progress_percentage: 125 } } })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuetext')).toContain('125%')
    expect(wrapper.get('.goal-progress-fill').attributes('style')).toContain('width: 100%')
    expect(wrapper.text()).toContain('above target')
  })
})
