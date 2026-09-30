import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))
const { apiRequest } = await import('../httpClient')
const service = await import('../notificationService')

describe('notification transport', () => {
  beforeEach(() => apiRequest.mockReset())

  it('uses the verified list and summary response shapes', async () => {
    const page = { data: [{ id: 7 }], next_cursor: 'cursor' }
    apiRequest.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ data: { data: { unread_count: 3, requires_action_count: 1 } } })
    await expect(service.getNotifications({ view: 'unread', limit: 25, cursor: 'previous' })).resolves.toEqual(page)
    expect(apiRequest).toHaveBeenNthCalledWith(1, { method: 'get', url: '/api/v1/notifications', params: { view: 'unread', limit: 25, cursor: 'previous' }, signal: undefined })
    await expect(service.getNotificationSummary()).resolves.toEqual({ unread_count: 3, requires_action_count: 1 })
  })

  it('uses CSRF for read, read-all, and open without assuming a destination exists', async () => {
    apiRequest.mockResolvedValueOnce({ data: { data: { id: 7, read_at: 'now' } } })
      .mockResolvedValueOnce({ data: { data: { changed_count: 4, summary: { unread_count: 0, requires_action_count: 2 } } } })
      .mockResolvedValueOnce({ data: { data: { id: 7, destination: null } } })
    await expect(service.markNotificationRead(7)).resolves.toEqual({ id: 7, read_at: 'now' })
    await expect(service.markAllNotificationsRead()).resolves.toEqual({ changed_count: 4, summary: { unread_count: 0, requires_action_count: 2 } })
    await expect(service.openNotification(7)).resolves.toEqual({ id: 7, destination: null })
    expect(apiRequest).toHaveBeenNthCalledWith(1, { method: 'patch', url: '/api/v1/notifications/7/read' }, { csrf: true })
    expect(apiRequest).toHaveBeenNthCalledWith(2, { method: 'post', url: '/api/v1/notifications/read-all' }, { csrf: true })
    expect(apiRequest).toHaveBeenNthCalledWith(3, { method: 'post', url: '/api/v1/notifications/7/open' }, { csrf: true })
  })
})
