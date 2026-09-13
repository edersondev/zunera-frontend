import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))

const { apiRequest } = await import('../httpClient')
const { removeTransaction, restoreTransaction, updateTransaction } = await import(
  '../transactionService'
)

describe('transactionService mutations', () => {
  beforeEach(() => apiRequest.mockReset())

  it('updates a transaction with the patch contract and supplied key', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 7 }, meta: {} } })

    await updateTransaction(7, { description: 'Corrigida' }, 'update-key')

    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'patch',
        url: '/api/v1/transactions/7',
        data: { description: 'Corrigida' },
        headers: { 'Idempotency-Key': 'update-key' },
      },
      { csrf: true },
    )
  })

  it('removes a transaction without a payload and restores with one', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 7 }, meta: {} } })

    await removeTransaction(7, 'remove-key')
    expect(apiRequest).toHaveBeenLastCalledWith(
      {
        method: 'post',
        url: '/api/v1/transactions/7/remove',
        data: undefined,
        headers: { 'Idempotency-Key': 'remove-key' },
      },
      { csrf: true },
    )

    await restoreTransaction(7, { status: 'pending' }, 'restore-key')
    expect(apiRequest).toHaveBeenLastCalledWith(
      {
        method: 'post',
        url: '/api/v1/transactions/7/restore',
        data: { status: 'pending' },
        headers: { 'Idempotency-Key': 'restore-key' },
      },
      { csrf: true },
    )
  })

  it('reuses one key only when the identical action is retried', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 7 }, meta: {} } })

    await removeTransaction(7, 'retry-key')
    await removeTransaction(7, 'retry-key')

    const keys = apiRequest.mock.calls.map(([request]) => request.headers['Idempotency-Key'])
    expect(keys).toEqual(['retry-key', 'retry-key'])
  })

  it('generates a distinct key per action when the caller does not supply one', async () => {
    let sequence = 0
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => `generated-${++sequence}`) })
    apiRequest.mockResolvedValue({ data: { data: { id: 7 }, meta: {} } })

    await removeTransaction(7)
    await removeTransaction(7)

    const keys = apiRequest.mock.calls.map(([request]) => request.headers['Idempotency-Key'])
    expect(keys).toEqual(['generated-1', 'generated-2'])
  })

  it('surfaces response metadata from a mutation so callers can render notices', async () => {
    apiRequest.mockResolvedValue({
      data: {
        data: { id: 7 },
        meta: { notice: { code: 'effective_future_date', message: 'Permanece efetiva.' } },
      },
    })

    await expect(updateTransaction(7, {}, 'notice-key')).resolves.toEqual({
      transaction: { id: 7 },
      meta: { notice: { code: 'effective_future_date', message: 'Permanece efetiva.' } },
    })
  })
})
