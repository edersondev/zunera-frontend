import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/notificationService', () => ({
  getNotifications: vi.fn(), getNotificationSummary: vi.fn(), markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(), openNotification: vi.fn(),
  getNotificationPreferences: vi.fn(), updateNotificationPreference: vi.fn(),
}))
const service = await import('@/services/notificationService')
const { useNotificationStore } = await import('../notificationStore')

describe('notification preferences', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads defaults, toggles one category, and preserves old history', async () => {
    const defaults = { credit_cards: true, recurring_transactions: true, budgets: true, financial_goals: true }
    service.getNotificationPreferences.mockResolvedValue(defaults)
    service.updateNotificationPreference.mockResolvedValue({ ...defaults, budgets: false })
    const store = useNotificationStore()
    store.bindOwner(12)
    store.items = [{ id: 3, category: 'budgets', title: 'Old event' }]
    await store.loadPreferences()
    expect(store.preferences).toEqual(defaults)
    await store.setPreference('budgets', false)
    expect(store.preferences.budgets).toBe(false)
    expect(store.items).toEqual([{ id: 3, category: 'budgets', title: 'Old event' }])
    expect(service.updateNotificationPreference).toHaveBeenCalledWith('budgets', false)
  })

  it('keeps confirmed server values on failure and clears owner preferences on switch', async () => {
    service.updateNotificationPreference.mockRejectedValue({ status: 503 })
    const store = useNotificationStore()
    store.bindOwner(12)
    store.preferences = { credit_cards: false, recurring_transactions: true, budgets: true, financial_goals: true }
    await store.setPreference('credit_cards', true)
    expect(store.preferences.credit_cards).toBe(false)
    expect(store.preferencesError.status).toBe(503)
    store.bindOwner(13)
    expect(store.preferences.credit_cards).toBe(true)
    expect(store.preferencesError).toBeNull()
  })
})
