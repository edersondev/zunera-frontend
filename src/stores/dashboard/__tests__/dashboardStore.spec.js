import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/dashboardService', () => ({
  getDashboardAccounts: vi.fn(),
  getDashboardEvolution: vi.fn(),
  getDashboardExpenseDistribution: vi.fn(),
  getDashboardRecentActivity: vi.fn(),
  getDashboardSummary: vi.fn(),
  getDashboardUpcomingActivity: vi.fn(),
}))

const {
  getDashboardAccounts,
  getDashboardEvolution,
  getDashboardExpenseDistribution,
  getDashboardRecentActivity,
  getDashboardSummary,
  getDashboardUpcomingActivity,
} = await import('@/services/dashboardService')

const { useDashboardStore } = await import('../dashboardStore')

describe('dashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads each section from its own request without blocking the others', async () => {
    getDashboardSummary.mockResolvedValue({ current_total_balance: { amount_centavos: 10 } })
    getDashboardAccounts.mockRejectedValue(new Error('accounts offline'))
    getDashboardExpenseDistribution.mockResolvedValue({ categories: [] })
    getDashboardEvolution.mockResolvedValue({ intervals: [] })
    getDashboardRecentActivity.mockResolvedValue([])
    getDashboardUpcomingActivity.mockResolvedValue({ items: [], meta: null })

    const store = useDashboardStore()
    await store.refreshAll()

    expect(store.summary).toEqual({ current_total_balance: { amount_centavos: 10 } })
    expect(store.summaryError).toBeNull()
    expect(store.accounts).toBeNull()
    expect(store.accountsError.message).toBe('accounts offline')
    expect(store.distribution).toEqual({ categories: [] })
    expect(store.evolution).toEqual({ intervals: [] })
    expect(store.recentActivity).toEqual([])
    expect(store.upcomingActivity).toEqual({ items: [], meta: null })
  })

  it('retries only the failed section and clears its error', async () => {
    getDashboardAccounts.mockRejectedValueOnce(new Error('offline'))
    getDashboardAccounts.mockResolvedValueOnce({ accounts: [] })

    const store = useDashboardStore()

    await store.fetchAccounts()
    expect(store.accountsError).toBeTruthy()

    await store.fetchAccounts()
    expect(store.accountsError).toBeNull()
    expect(store.accounts).toEqual({ accounts: [] })
    expect(getDashboardAccounts).toHaveBeenCalledTimes(2)
  })

  it('tracks loading per section while a request is in flight', async () => {
    let releaseSummary
    getDashboardSummary.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseSummary = () => resolve({ current_total_balance: { amount_centavos: 0 } })
        }),
    )

    const store = useDashboardStore()
    const pending = store.fetchSummary()

    expect(store.summaryLoading).toBe(true)
    expect(store.accountsLoading).toBe(false)

    releaseSummary()
    await pending

    expect(store.summaryLoading).toBe(false)
  })

  it('sends period presets and custom boundaries to period scoped sections', async () => {
    getDashboardSummary.mockResolvedValue({})
    getDashboardExpenseDistribution.mockResolvedValue({})
    getDashboardEvolution.mockResolvedValue({})

    const store = useDashboardStore()

    await store.loadPeriodSections()
    expect(getDashboardSummary).toHaveBeenLastCalledWith({
      preset: 'current_month',
      from: null,
      to: null,
    })

    store.setPeriod({ preset: 'custom', from: '2026-09-01', to: '2026-09-03' })
    await store.loadPeriodSections()

    expect(getDashboardSummary).toHaveBeenLastCalledWith({
      preset: 'custom',
      from: '2026-09-01',
      to: '2026-09-03',
    })
    expect(getDashboardEvolution).toHaveBeenLastCalledWith({
      preset: 'custom',
      from: '2026-09-01',
      to: '2026-09-03',
    })
    expect(getDashboardAccounts).not.toHaveBeenCalled()
  })

  it('reports a user without active accounts so the dashboard can offer a call to action', async () => {
    getDashboardAccounts.mockResolvedValue({ accounts: [], current_total_balance: null })

    const store = useDashboardStore()
    await store.fetchAccounts()

    expect(store.hasNoActiveAccounts).toBe(true)
  })
})
