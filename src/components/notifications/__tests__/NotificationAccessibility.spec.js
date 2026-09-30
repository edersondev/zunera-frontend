import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NotificationItem from '../NotificationItem.vue'
import { i18n } from '@/i18n'

describe('notification accessibility', () => {
  it('names read, resolved, and unavailable states in text and hides an unusable source action', () => {
    i18n.global.locale.value = 'en'
    const item = { id: 3, type: 'budget_exceeded', origin: 'budgets', title: 'Plan exceeded',
      summary: 'R$ 100,00 over plan', event_at: '2026-09-29T12:00:00Z',
      read_at: '2026-09-29T13:00:00Z', resolved_at: '2026-09-29T14:00:00Z',
      requires_action: false, source_available: false, destination: null }
    const wrapper = mount(NotificationItem, { props: { item }, global: { stubs: { ElButton: { template: '<button><slot /></button>' } } } })
    expect(wrapper.text()).toContain('Resolved')
    expect(wrapper.text()).toContain('The source record is no longer available.')
    expect(wrapper.text()).not.toContain('Unread')
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
