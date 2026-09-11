import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))
const { apiRequest } = await import('../httpClient')
const { createTransaction, listTransactions } = await import('../transactionService')

describe('transactionService', () => {
  beforeEach(() => apiRequest.mockReset())

  it('lists transaction collection data and pagination metadata', async () => {
    apiRequest.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { total: 1 }, links: {} } })
    await expect(listTransactions({ type: 'income' })).resolves.toEqual({ items: [{ id: 1 }], meta: { total: 1 }, links: {} })
  })

  it('sends mutation with csrf and supplied idempotency key', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 1 } } })
    await createTransaction({ description: 'Receita' }, 'retry-key')
    expect(apiRequest).toHaveBeenCalledWith({ method: 'post', url: '/api/v1/transactions', data: { description: 'Receita' }, headers: { 'Idempotency-Key': 'retry-key' } }, { csrf: true })
  })
})
