import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NotificationIndicator from '../NotificationIndicator.vue'
import NotificationItem from '../NotificationItem.vue'
import { useNotificationStore } from '@/stores/notifications/notificationStore'
import { i18n } from '@/i18n'

const buttonStub = { template: '<button><slot /></button>' }

describe('notification center presentation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    i18n.global.locale.value = 'en'
  })

  it('names the indicator and shows no zero badge, exact count through 99, then 99+', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const mountedStore = useNotificationStore(pinia)
    const wrapper = mount(NotificationIndicator, { global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub, ElIcon: true } } })
    expect(wrapper.get('a').attributes('aria-label')).toContain('none unread')
    expect(wrapper.find('.notification-count').exists()).toBe(false)
    mountedStore.summary = { unread_count: 99, requires_action_count: 0 }
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.notification-count').text()).toBe('99')
    mountedStore.summary = { unread_count: 100, requires_action_count: 0 }
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.notification-count').text()).toBe('99+')
    expect(wrapper.get('a').attributes('aria-label')).toContain('100 unread')
  })

  it('keeps read state distinct from pending action and treats hostile text as text', async () => {
    const item = {
      id: 7, title: '<img src=x onerror=alert(1)>', summary: 'Payment due',
      type: 'statement_due_today', origin: 'credit_cards', event_at: '2026-09-29T12:00:00Z',
      read_at: '2026-09-29T12:01:00Z', resolved_at: null, requires_action: true,
      source_available: true, destination: { kind: 'credit_card_statement', params: { statement_id: 2 } },
    }
    const wrapper = mount(NotificationItem, { props: { item }, global: { stubs: { ElButton: buttonStub } } })
    expect(wrapper.get('h2').text()).toBe(item.title)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Requires attention')
    expect(wrapper.find('.unread-label').exists()).toBe(false)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual([7])
  })
})
