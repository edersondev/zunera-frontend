import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))
const { apiRequest } = await import('../httpClient')
const { getFinancialReport } = await import('../reportsService')

describe('reports overview transport', () => {
  beforeEach(() => { apiRequest.mockReset() })

  it('forwards canonical period and filters and returns the data body', async () => {
    const body = { scope: { preset: 'historical_month', month: '2026-07' }, source_revision: 'revision-1', summary: {} }
    apiRequest.mockResolvedValue({ data: { data: body } })
    await expect(getFinancialReport({ preset: 'historical_month', month: '2026-07', account_id: 4, category_id: null, transaction_type: 'expense' })).resolves.toBe(body)
    expect(apiRequest).toHaveBeenCalledWith({ method: 'get', url: '/api/v1/financial-reports', params: { preset: 'historical_month', month: '2026-07', account_id: 4, transaction_type: 'expense' }, signal: undefined })
  })

  it('preserves the source revision and passes cancellation to the transport', async () => {
    const controller = new AbortController()
    const body = { source_revision: 'revision-1', summary: {} }
    apiRequest.mockResolvedValue({ data: { data: body } })

    await expect(getFinancialReport({ preset: 'current_month' }, { signal: controller.signal })).resolves.toBe(body)
    expect(apiRequest.mock.calls[0][0].signal).toBe(controller.signal)
  })

  it('keeps nullable month out of nonhistorical requests and propagates contract errors', async () => {
    apiRequest.mockRejectedValue(new Error('Invalid scope'))
    await expect(getFinancialReport({ preset: 'current_month', month: null })).rejects.toThrow('Invalid scope')
    expect(apiRequest.mock.calls[0][0].params).toEqual({ preset: 'current_month' })
  })
})
