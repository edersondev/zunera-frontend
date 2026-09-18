import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  apiRequest: vi.fn(),
}))

const { apiRequest } = await import('../httpClient')
const {
  getDashboardAccounts,
  getDashboardEvolution,
  getDashboardExpenseDistribution,
  getDashboardRecentActivity,
  getDashboardSummary,
  getDashboardUpcomingActivity,
} = await import('../dashboardService')

const BASE_URL = '/api/v1/financial-dashboard'

describe('dashboardService', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('reads every independent section from its own endpoint', async () => {
    apiRequest.mockResolvedValue({ data: { data: { accounts: [] } } })

    await getDashboardSummary()
    await getDashboardAccounts()
    await getDashboardExpenseDistribution()
    await getDashboardEvolution()
    await getDashboardRecentActivity()

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      url: `${BASE_URL}/summary`,
      params: {},
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: `${BASE_URL}/accounts`,
    })
    expect(apiRequest).toHaveBeenNthCalledWith(3, {
      method: 'get',
      url: `${BASE_URL}/expense-distribution`,
      params: {},
    })
    expect(apiRequest).toHaveBeenNthCalledWith(4, {
      method: 'get',
      url: `${BASE_URL}/evolution`,
      params: {},
    })
    expect(apiRequest).toHaveBeenNthCalledWith(5, {
      method: 'get',
      url: `${BASE_URL}/recent-activity`,
    })
  })

  it('sends presets alone and custom boundaries together', async () => {
    apiRequest.mockResolvedValue({ data: { data: {} } })

    await getDashboardSummary({ preset: 'previous_month', from: '2026-08-01', to: '2026-08-31' })
    await getDashboardEvolution({ preset: 'custom', from: '2026-09-01', to: '2026-09-03' })

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      url: `${BASE_URL}/summary`,
      params: { preset: 'previous_month' },
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: `${BASE_URL}/evolution`,
      params: { preset: 'custom', from: '2026-09-01', to: '2026-09-03' },
    })
  })

  it('keeps the upcoming horizon metadata beside its items', async () => {
    apiRequest.mockResolvedValue({
      data: { data: [{ source_kind: 'pending_transaction' }], meta: { from: 'a', to: 'b' } },
    })

    await expect(getDashboardUpcomingActivity()).resolves.toEqual({
      items: [{ source_kind: 'pending_transaction' }],
      meta: { from: 'a', to: 'b' },
    })
  })

  it('propagates request failures so the affected section can retry', async () => {
    apiRequest.mockRejectedValue(new Error('offline'))

    await expect(getDashboardAccounts()).rejects.toThrow('offline')
  })
})
