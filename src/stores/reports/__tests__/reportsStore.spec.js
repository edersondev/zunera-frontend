import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/reportsService', () => ({ getFinancialReport: vi.fn(), getFinancialReportContributions: vi.fn() }))
const { getFinancialReport, getFinancialReportContributions } = await import('@/services/reportsService')
const { useReportsStore } = await import('../reportsStore')

describe('reportsStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('keeps only the latest overview after rapid scope changes', async () => {
    let first
    getFinancialReport.mockImplementationOnce(() => new Promise((resolve) => { first = resolve })).mockResolvedValueOnce({ scope: { preset: 'previous_month' } })
    const store = useReportsStore()
    const pending = store.loadOverview({ preset: 'current_month' })
    expect(store.loading).toBe(true)
    await store.loadOverview({ preset: 'previous_month' })
    first({ scope: { preset: 'current_month' } })
    await pending
    expect(store.overview.scope.preset).toBe('previous_month')
    expect(store.loading).toBe(false)
  })

  it('supports retry after overview error', async () => {
    getFinancialReport.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ summary: {} })
    const store = useReportsStore()
    await store.loadOverview({})
    expect(store.error.message).toBe('offline')
    await store.loadOverview({})
    expect(store.error).toBeNull()
    expect(store.overview).toEqual({ summary: {} })
  })

  it('appends detail pages while preserving the all-record total', async () => {
    getFinancialReportContributions.mockResolvedValueOnce({ total: { amount_centavos: 101 }, contributions: [{ source_id: 1 }], next_cursor: 'next' }).mockResolvedValueOnce({ total: { amount_centavos: 101 }, contributions: [{ source_id: 2 }], next_cursor: null })
    const store = useReportsStore()
    await store.loadDetail({}, { metric: 'financial_result' })
    await store.loadDetail({}, { metric: 'financial_result', cursor: 'next' }, { append: true })
    expect(store.detail.total.amount_centavos).toBe(101)
    expect(store.detail.contributions.map((row) => row.source_id)).toEqual([1, 2])
  })
})
