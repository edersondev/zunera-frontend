import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NotificationItem from '../NotificationItem.vue'
import { notificationDestination } from '@/services/notificationDestination'
import { i18n } from '@/i18n'

const buttonStub = { template: '<button><slot /></button>' }

describe('statement notification presentation', () => {
  it.each([
    ['statement_approaching', 'Statement due soon'],
    ['statement_due_today', 'Statement due today'],
    ['statement_overdue', 'Statement overdue'],
  ])('shows masked source text and keeps read independent from payment for %s', async (type, title) => {
    i18n.global.locale.value = 'en'
    const item = {
      id: 9, type, title, summary: 'Visa •••• 1234, R$ 50,00 remaining after partial payment',
      origin: 'credit_cards', event_at: '2026-09-29T12:00:00Z', read_at: null,
      resolved_at: null, requires_action: true, source_available: true,
      destination: { kind: 'credit_card_statement', params: { statement_id: 27 } },
    }
    const wrapper = mount(NotificationItem, { props: { item }, global: { stubs: { ElButton: buttonStub } } })
    expect(wrapper.text()).toContain('•••• 1234')
    expect(wrapper.text()).not.toMatch(/\d{12,19}/)
    expect(wrapper.text()).toContain('Requires attention')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('read')?.[0]).toEqual([9])
    expect(notificationDestination(item.destination)).toEqual({ name: 'credit-card-statement-detail', params: { statement_id: 27 } })
  })
})
