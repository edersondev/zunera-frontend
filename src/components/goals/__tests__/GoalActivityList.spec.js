import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { messages } from '@/i18n/messages'
import GoalActivityList from '../GoalActivityList.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages })

describe('GoalActivityList', () => {
  it('shows the local time for same-day goal activities', () => {
    const wrapper = mount(GoalActivityList, { global: { plugins: [i18n] }, props: { items: [
      { id: 1, type: 'allocated', amount_centavos: 100, occurred_at: '2026-09-26T13:30:00+00:00' },
      { id: 2, type: 'withdrawn', amount_centavos: 50, occurred_at: '2026-09-26T14:45:00+00:00' },
    ] } })
    expect(wrapper.text()).toContain('10:30')
    expect(wrapper.text()).toContain('11:45')
  })
})
