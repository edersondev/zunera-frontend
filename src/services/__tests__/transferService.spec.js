import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))

const { apiRequest } = await import('../httpClient')
const {
  createTransfer,
  getTransfer,
  listTransfers,
  removeTransfer,
  restoreTransfer,
  updateTransfer,
} = await import('../transferService')

describe('transferService', () => {
  beforeEach(() => apiRequest.mockReset())

  it('lists the owned transfer collection with pagination metadata', async () => {
    apiRequest.mockResolvedValue({
      data: { data: [{ id: 1 }], meta: { total: 1 }, links: { next: null } },
    })

    await expect(listTransfers({ status: 'pending' })).resolves.toEqual({
      items: [{ id: 1 }],
      meta: { total: 1 },
      links: { next: null },
    })
    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      url: '/api/v1/transfers',
      params: { status: 'pending' },
    })
  })

  it('reads one owned transfer', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 7 } } })

    await expect(getTransfer(7)).resolves.toEqual({ id: 7 })
  })

  it('sends a create with csrf and exactly one idempotency key per logical request', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 1 }, meta: {} } })

    await createTransfer({ amount_centavos: 100 })
    await createTransfer({ amount_centavos: 200 })
    const firstKey = apiRequest.mock.calls[0][0].headers['Idempotency-Key']
    const secondKey = apiRequest.mock.calls[1][0].headers['Idempotency-Key']

    expect(firstKey).toBeTruthy()
    expect(secondKey).not.toBe(firstKey)
    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'post',
        url: '/api/v1/transfers',
        data: { amount_centavos: 200 },
        headers: { 'Idempotency-Key': secondKey },
      },
      { csrf: true },
    )
  })

  it('reuses a supplied key only for an exact retry', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 1 }, meta: {} } })

    await createTransfer({ amount_centavos: 100 }, 'retry-key')
    await createTransfer({ amount_centavos: 100 }, 'retry-key')

    expect(apiRequest.mock.calls[0][0].headers['Idempotency-Key']).toBe('retry-key')
    expect(apiRequest.mock.calls[1][0].headers['Idempotency-Key']).toBe('retry-key')
  })

  it('uses the per-action contract for update, remove, and restore', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 7 }, meta: {} } })

    await updateTransfer(7, { amount_centavos: 500 }, 'update-key')
    expect(apiRequest).toHaveBeenLastCalledWith(
      {
        method: 'patch',
        url: '/api/v1/transfers/7',
        data: { amount_centavos: 500 },
        headers: { 'Idempotency-Key': 'update-key' },
      },
      { csrf: true },
    )

    await removeTransfer(7, 'remove-key')
    expect(apiRequest).toHaveBeenLastCalledWith(
      {
        method: 'post',
        url: '/api/v1/transfers/7/remove',
        data: undefined,
        headers: { 'Idempotency-Key': 'remove-key' },
      },
      { csrf: true },
    )

    await restoreTransfer(7, { status: 'pending' }, 'restore-key')
    expect(apiRequest).toHaveBeenLastCalledWith(
      {
        method: 'post',
        url: '/api/v1/transfers/7/restore',
        data: { status: 'pending' },
        headers: { 'Idempotency-Key': 'restore-key' },
      },
      { csrf: true },
    )
  })

  it('surfaces the typed notice carried by a mutation response', async () => {
    apiRequest.mockResolvedValue({
      data: { data: { id: 7 }, meta: { notice: { code: 'effective_future_date', message: 'Permanece efetiva.' } } },
    })

    await expect(updateTransfer(7, { transfer_date: '2030-01-01' }, 'notice-key')).resolves.toMatchObject({
      meta: { notice: { code: 'effective_future_date' } },
    })
  })
})
