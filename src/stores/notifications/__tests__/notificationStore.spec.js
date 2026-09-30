import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/notificationService', () => ({
  getNotifications: vi.fn(), getNotificationSummary: vi.fn(), markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(), openNotification: vi.fn(),
}))
const service = await import('@/services/notificationService')
const { useNotificationStore } = await import('../notificationStore')

describe('notification shared store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('keeps owner-scoped summary, exact count label, filter, and cursor pages', async () => {
    service.getNotificationSummary.mockResolvedValue({ unread_count: 100, requires_action_count: 2 })
    service.getNotifications.mockResolvedValueOnce({ data: [{ id: 4 }], next_cursor: 'next' })
      .mockResolvedValueOnce({ data: [{ id: 3 }], next_cursor: null })
    const store = useNotificationStore()
    store.bindOwner(12)
    await store.loadSummary()
    expect(store.unreadLabel).toBe('99+')
    expect(store.summaryLoaded).toBe(true)
    await store.loadFirst('unread')
    await store.loadMore()
    expect(store.view).toBe('unread')
    expect(store.items.map((item) => item.id)).toEqual([4, 3])
    expect(store.nextCursor).toBeNull()
    expect(service.getNotifications).toHaveBeenNthCalledWith(2, { view: 'unread', limit: 25, cursor: 'next' })
  })

  it('marks read without resolving action and updates all-page summary', async () => {
    service.markNotificationRead.mockResolvedValue({ id: 4, read_at: 'now', requires_action: true })
    service.markAllNotificationsRead.mockResolvedValue({ changed_count: 2, summary: { unread_count: 0, requires_action_count: 1 } })
    service.getNotificationSummary.mockResolvedValue({ unread_count: 1, requires_action_count: 1 })
    const store = useNotificationStore()
    store.bindOwner(12)
    store.items = [{ id: 4, read_at: null, requires_action: true }]
    await store.markRead(4)
    expect(store.items[0]).toMatchObject({ read_at: 'now', requires_action: true })
    await store.markAllRead()
    expect(store.summary).toEqual({ unread_count: 0, requires_action_count: 1 })
  })

  it('ignores list and summary responses started before read-all', async () => {
    let resolvePage
    let resolveSummary
    service.getNotifications.mockImplementation(() => new Promise((resolve) => { resolvePage = resolve }))
    service.getNotificationSummary.mockImplementation(() => new Promise((resolve) => { resolveSummary = resolve }))
    service.markAllNotificationsRead.mockResolvedValue({ changed_count: 1, summary: { unread_count: 0, requires_action_count: 1 } })
    const store = useNotificationStore()
    store.bindOwner(12)
    const pendingPage = store.loadFirst('unread')
    const pendingSummary = store.loadSummary()

    await store.markAllRead()
    resolvePage({ data: [{ id: 4, read_at: null }], next_cursor: 'stale' })
    resolveSummary({ unread_count: 1, requires_action_count: 1 })
    await Promise.all([pendingPage, pendingSummary])

    expect(store.items).toEqual([])
    expect(store.nextCursor).toBeNull()
    expect(store.summary.unread_count).toBe(0)
    expect(store.summaryLoaded).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.summaryLoading).toBe(false)
  })

  it('ignores a pending unread load-more response after read-all', async () => {
    let resolvePage
    service.getNotifications.mockImplementation(() => new Promise((resolve) => { resolvePage = resolve }))
    service.markAllNotificationsRead.mockResolvedValue({ changed_count: 2, summary: { unread_count: 0, requires_action_count: 0 } })
    const store = useNotificationStore()
    store.bindOwner(12)
    store.view = 'unread'
    store.items = [{ id: 4, read_at: null }]
    store.nextCursor = 'next'
    const pendingPage = store.loadMore()

    await store.markAllRead()
    resolvePage({ data: [{ id: 3, read_at: null }], next_cursor: null })
    await pendingPage

    expect(store.items).toEqual([])
    expect(store.nextCursor).toBeNull()
    expect(store.summary.unread_count).toBe(0)
  })

  it('resets on session switch and ignores an old owner response', async () => {
    let resolveSummary
    service.getNotificationSummary.mockImplementation(() => new Promise((resolve) => { resolveSummary = resolve }))
    const store = useNotificationStore()
    store.bindOwner(12)
    const pending = store.loadSummary()
    store.bindOwner(13)
    resolveSummary({ unread_count: 9, requires_action_count: 1 })
    await pending
    expect(store.summary.unread_count).toBe(0)
    store.reset()
    expect(store.ownerId).toBeNull()
    expect(store.items).toEqual([])
  })

  it('ignores an old owner 401 but clears the active owner on a current 401', async () => {
    let rejectOld
    service.getNotifications.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectOld = reject }))
      .mockRejectedValueOnce({ status: 401 })
    const store = useNotificationStore()
    store.bindOwner(12)
    const oldPage = store.loadFirst()
    store.bindOwner(13)
    rejectOld({ status: 401 })
    await oldPage
    expect(store.ownerId).toBe(13)
    await store.loadFirst()
    expect(store.ownerId).toBeNull()
  })

  it('does not let a prior owner mutation failure erase a new owner session', async () => {
    let rejectOld
    service.markNotificationRead.mockImplementation(() => new Promise((resolve, reject) => { rejectOld = reject }))
    const store = useNotificationStore()
    store.bindOwner(12)
    const oldMutation = store.markRead(4).catch(() => null)
    store.bindOwner(13)
    rejectOld({ status: 401 })
    await oldMutation
    expect(store.ownerId).toBe(13)
  })
})
