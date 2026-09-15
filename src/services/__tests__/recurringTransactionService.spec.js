import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/httpClient', () => ({ apiRequest: vi.fn() }))

const { apiRequest } = await import('@/services/httpClient')
const service = await import('../recurringTransactionService')

describe('recurringTransactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiRequest.mockResolvedValue({ data: { data: { id: 1 }, meta: { total: 3 } } })
  })

  it('lists rules and occurrences through the v1 endpoints', async () => {
    const listed = await service.listRecurringTransactions({ state: 'active' })
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'get', url: '/api/v1/recurring-transactions', params: { state: 'active' } }),
    )
    expect(listed.meta).toEqual({ total: 3 })

    await service.listRecurringTransactionOccurrences(7, { per_page: 50 })
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/v1/recurring-transactions/7/occurrences' }),
    )
  })

  it('sends an idempotency key on every mutation', async () => {
    await service.createRecurringTransaction({ description: 'Aluguel' }, 'key-1')
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/api/v1/recurring-transactions',
        headers: { 'Idempotency-Key': 'key-1' },
      }),
      { csrf: true },
    )

    await service.updateRecurringTransaction(4, { amount_centavos: 100 }, 'key-2')
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'patch', url: '/api/v1/recurring-transactions/4' }),
      { csrf: true },
    )

    await service.pauseRecurringTransaction(4, 'key-3')
    await service.resumeRecurringTransaction(4, 'key-4')
    await service.endRecurringTransaction(4, 'key-5')
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/v1/recurring-transactions/4/end' }),
      { csrf: true },
    )
  })
})
