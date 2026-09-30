import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NotificationItem from '../NotificationItem.vue'
import { notificationDestination } from '@/services/notificationDestination'
import { i18n } from '@/i18n'

describe('goal milestone notification', () => {
  it('presents the reached milestone as information and navigates to the goal', () => {
    i18n.global.locale.value = 'en'
    const item = {
      id: 13, type: 'goal_reached', title: 'Target reached', summary: 'Vacation target of R$ 5.000,00 reached',
      origin: 'financial_goals', event_at: '2026-09-29T12:00:00Z', read_at: null,
      resolved_at: null, requires_action: false, source_available: true,
      destination: { kind: 'goal', params: { goal_id: 8 } },
    }
    const wrapper = mount(NotificationItem, { props: { item }, global: { stubs: { ElButton: { template: '<button><slot /></button>' } } } })
    expect(wrapper.text()).toContain('Informational')
    expect(wrapper.text()).not.toContain('Requires attention')
    expect(notificationDestination(item.destination)).toEqual({ name: 'goal-detail', params: { goal_id: 8 } })
  })
})
