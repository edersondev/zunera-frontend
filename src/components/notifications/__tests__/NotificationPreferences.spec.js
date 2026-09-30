import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NotificationPreferences from '../NotificationPreferences.vue'
import { i18n } from '@/i18n'

describe('notification preference controls', () => {
  it('names all four switches and explains Critical follows the category', () => {
    i18n.global.locale.value = 'en'
    const wrapper = mount(NotificationPreferences, {
      props: { preferences: { credit_cards: true, recurring_transactions: true, budgets: false, financial_goals: true } },
      global: { stubs: { ElSwitch: { props: ['modelValue'], template: '<button role="switch" :aria-checked="modelValue"><slot /></button>' } } },
    })
    expect(wrapper.findAll('[role="switch"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('Critical notices also follow the preference for their category.')
  })
})
