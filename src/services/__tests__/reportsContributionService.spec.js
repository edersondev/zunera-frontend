import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))
const { apiRequest } = await import('../httpClient')
const { getFinancialReportContributions } = await import('../reportsService')

describe('reports contribution transport', () => {
  beforeEach(() => { apiRequest.mockReset() })

  it('forwards metric, period, filters and cursor without changing signed rows', async () => {
    const body = { total: { amount_centavos: 123, currency_code: 'BRL' }, contributions: [{ signed_amount: { amount_centavos: -2 } }], next_cursor: null }
    apiRequest.mockResolvedValue({ data: { data: body } })
    await expect(getFinancialReportContributions({ preset: 'custom', from: '2026-09-01', to: '2026-09-09', category_id: 3 }, { metric: 'expense_category', metric_id: 3, which_period: 'previous', cursor: 'abc', limit: 20 })).resolves.toBe(body)
    expect(apiRequest.mock.calls[0][0]).toMatchObject({ method: 'get', url: '/api/v1/financial-reports/contributions', params: { preset: 'custom', from: '2026-09-01', to: '2026-09-09', category_id: 3, metric: 'expense_category', metric_id: 3, which_period: 'previous', cursor: 'abc', limit: 20 } })
  })

  it('propagates invalid cursor errors', async () => {
    apiRequest.mockRejectedValue(new Error('Invalid cursor'))
    await expect(getFinancialReportContributions({}, { metric: 'financial_result', cursor: 'bad' })).rejects.toThrow('Invalid cursor')
  })
})
