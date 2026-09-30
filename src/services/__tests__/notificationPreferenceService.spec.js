import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))
const { apiRequest } = await import('../httpClient')
const service = await import('../notificationService')

describe('notification preference transport', () => {
  beforeEach(() => apiRequest.mockReset())

  it('reads four defaults and patches one future category with CSRF', async () => {
    const values = { credit_cards: true, recurring_transactions: true, budgets: true, financial_goals: true }
    apiRequest.mockResolvedValueOnce({ data: { data: values } })
      .mockResolvedValueOnce({ data: { data: { ...values, budgets: false } } })
    await expect(service.getNotificationPreferences()).resolves.toEqual(values)
    await expect(service.updateNotificationPreference('budgets', false)).resolves.toMatchObject({ budgets: false })
    expect(apiRequest).toHaveBeenNthCalledWith(1, { method: 'get', url: '/api/v1/notification-preferences' })
    expect(apiRequest).toHaveBeenNthCalledWith(2, { method: 'patch', url: '/api/v1/notification-preferences/budgets', data: { enabled: false } }, { csrf: true })
  })
})
