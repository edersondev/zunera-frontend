import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/reportsService', async (importOriginal) => ({ ...await importOriginal(), getFinancialReport: vi.fn(), getFinancialReportContributions: vi.fn() }))
const { getFinancialReport, getFinancialReportContributions } = await import('@/services/reportsService')
const { useReportsStore } = await import('../reportsStore')
const scope = { preset: 'current_month' }
const target = { metric: 'realized_expenses' }
const overviewResult = (revision, amount = 100) => ({ source_revision: revision, scope: { preset: 'current_month' }, summary: { realized_expenses: { amount_centavos: amount } } })
const detailResult = (revision, amount = 100, rows = [{ source_id: 1 }], cursor = null) => ({ source_revision: revision, scope: { preset: 'current_month' }, total: { amount_centavos: amount }, contributions: rows, next_cursor: cursor })

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
    getFinancialReport.mockResolvedValue(overviewResult('same', 101))
    getFinancialReportContributions.mockResolvedValueOnce(detailResult('same', 101, [{ source_id: 1 }], 'next')).mockResolvedValueOnce(detailResult('same', 101, [{ source_id: 2 }]))
    const store = useReportsStore()
    await store.loadOverview(scope)
    await store.loadDetail(scope, target)
    await store.loadDetail(scope, { ...target, cursor: 'next' }, { append: true })
    expect(store.detail.total.amount_centavos).toBe(101)
    expect(store.detail.contributions.map((row) => row.source_id)).toEqual([1, 2])
  })

  it('refreshes overview and detail when source revision changes with the amount', async () => {
    getFinancialReport.mockResolvedValueOnce(overviewResult('old')).mockResolvedValueOnce(overviewResult('new', 200))
    getFinancialReportContributions.mockResolvedValueOnce(detailResult('new', 200)).mockResolvedValueOnce(detailResult('new', 200))
    const store = useReportsStore()
    await store.loadOverview(scope)
    await store.loadDetail(scope, target)
    expect(store.overview.source_revision).toBe('new')
    expect(store.detail.source_revision).toBe('new')
    expect(store.changeNotice).toBe(true)
    expect(getFinancialReport).toHaveBeenCalledTimes(2)
  })

  it.each(['offsetting contributor substitution', 'same-amount label edit'])('refreshes for %s even when the total is unchanged', async () => {
    getFinancialReport.mockResolvedValueOnce(overviewResult('old')).mockResolvedValueOnce(overviewResult('new'))
    getFinancialReportContributions.mockResolvedValueOnce(detailResult('new')).mockResolvedValueOnce(detailResult('new'))
    const store = useReportsStore()
    await store.loadOverview(scope)
    await store.loadDetail(scope, target)
    expect(store.overview.source_revision).toBe('new')
    expect(store.detail.source_revision).toBe('new')
    expect(store.changeNotice).toBe(true)
  })

  it('rejects an old refresh when scope changes during the request', async () => {
    let resolveOldRefresh
    getFinancialReport.mockResolvedValueOnce(overviewResult('old'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldRefresh = resolve }))
      .mockResolvedValueOnce({ ...overviewResult('new-scope'), scope: { preset: 'previous_month' } })
    getFinancialReportContributions.mockResolvedValueOnce(detailResult('changed')).mockResolvedValueOnce(detailResult('changed'))
    const store = useReportsStore()
    await store.loadOverview(scope)
    const pending = store.loadDetail(scope, target)
    await Promise.resolve()
    await store.loadOverview({ preset: 'previous_month' })
    resolveOldRefresh(overviewResult('changed'))
    await pending
    expect(store.overview.scope.preset).toBe('previous_month')
    expect(store.detail).toBeNull()
    expect(store.changeNotice).toBe(false)
  })

  it('discards stale later-page rows and restarts detail from first page', async () => {
    getFinancialReport.mockResolvedValueOnce(overviewResult('old')).mockResolvedValueOnce(overviewResult('new'))
    getFinancialReportContributions.mockResolvedValueOnce(detailResult('old', 100, [{ source_id: 1 }], 'cursor'))
      .mockResolvedValueOnce(detailResult('new', 100, [{ source_id: 2 }]))
      .mockResolvedValueOnce(detailResult('new', 100, [{ source_id: 3 }]))
    const store = useReportsStore()
    await store.loadOverview(scope)
    await store.loadDetail(scope, target)
    await store.loadDetail(scope, { ...target, cursor: 'cursor' }, { append: true })
    expect(store.detail.contributions.map((row) => row.source_id)).toEqual([3])
    expect(store.changeNotice).toBe(true)
    expect(getFinancialReportContributions.mock.calls[2][1].cursor).toBeUndefined()
  })

  it('bounds retries and offers a recoverable error during continuing changes', async () => {
    getFinancialReport.mockResolvedValueOnce(overviewResult('old')).mockResolvedValue(overviewResult('overview-new'))
    getFinancialReportContributions.mockResolvedValueOnce(detailResult('detail-new')).mockResolvedValue(detailResult('detail-new'))
    const store = useReportsStore()
    await store.loadOverview(scope)
    await store.loadDetail(scope, target)
    expect(store.overview).toBeNull()
    expect(store.detail).toBeNull()
    expect(store.detailError).toBeTruthy()
    expect(getFinancialReport).toHaveBeenCalledTimes(4)

    getFinancialReport.mockResolvedValueOnce(overviewResult('stable'))
    getFinancialReportContributions.mockResolvedValueOnce(detailResult('stable')).mockResolvedValueOnce(detailResult('stable'))
    await store.loadDetail(scope, target)
    expect(store.detail.source_revision).toBe('stable')
    expect(store.detailError).toBeNull()
    expect(store.changeNotice).toBe(true)
  })
})
