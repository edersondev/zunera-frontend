import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/recurringTransactionService', () => ({
  createRecurringTransaction: vi.fn(),
  endRecurringTransaction: vi.fn(),
  getRecurringTransaction: vi.fn(),
  listRecurringTransactionOccurrences: vi.fn(),
  listRecurringTransactions: vi.fn(),
  pauseRecurringTransaction: vi.fn(),
  resumeRecurringTransaction: vi.fn(),
  updateRecurringTransaction: vi.fn(),
}))

const service = await import('@/services/recurringTransactionService')
const { useRecurringTransactionStore } = await import('../recurringTransactionStore')

const rule = { id: 4, description: 'Aluguel', state: 'active', next_expected_occurrence: '2026-10-05' }

describe('recurringTransactionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    service.listRecurringTransactions.mockResolvedValue({
      items: [rule],
      meta: { total: 1, current_page: 1, last_page: 1 },
      links: {},
    })
    service.listRecurringTransactionOccurrences.mockResolvedValue({ items: [], meta: { total: 0 } })
    service.getRecurringTransaction.mockResolvedValue(rule)
    service.createRecurringTransaction.mockResolvedValue({ rule, meta: {} })
    service.updateRecurringTransaction.mockResolvedValue({ rule, meta: {} })
    service.pauseRecurringTransaction.mockResolvedValue({ rule: { ...rule, state: 'paused' }, meta: {} })
    service.resumeRecurringTransaction.mockResolvedValue({ rule, meta: {} })
    service.endRecurringTransaction.mockResolvedValue({ rule: { ...rule, state: 'ended' }, meta: {} })
  })

  it('resets to the first page whenever filters change', async () => {
    const store = useRecurringTransactionStore()

    await store.setFilters({ state: 'paused', frequency: 'weekly' })

    expect(store.filters).toMatchObject({ state: 'paused', frequency: 'weekly', page: 1 })
    expect(service.listRecurringTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'paused', frequency: 'weekly', page: 1 }),
    )
    expect(store.items).toHaveLength(1)
  })

  it('reuses one idempotency key per logical mutation and clears it after success', async () => {
    const store = useRecurringTransactionStore()

    await store.create({ description: 'Aluguel' })
    const firstKey = service.createRecurringTransaction.mock.calls[0][1]
    await store.create({ description: 'Aluguel' })
    const secondKey = service.createRecurringTransaction.mock.calls[1][1]

    expect(firstKey).not.toBe(secondKey)
    expect(store.notice).toBe('recurringTransactions.created')
    expect(store.items).toHaveLength(1)
  })

  it('exposes validation errors and keeps a reusable retry key after failure', async () => {
    const store = useRecurringTransactionStore()
    const failure = Object.assign(new Error('Invalid'), {
      errors: { description: ['Informe uma descrição.'] },
    })
    service.createRecurringTransaction.mockRejectedValueOnce(failure)

    await expect(store.create({ description: '' })).rejects.toThrow('Invalid')
    expect(store.validationErrors.description).toEqual(['Informe uma descrição.'])
    const failedKey = service.createRecurringTransaction.mock.calls[0][1]

    await store.create({ description: 'Corrigido' })
    expect(service.createRecurringTransaction.mock.calls[1][1]).toBe(failedKey)
  })

  it('loads the occurrence list with the rule detail', async () => {
    const store = useRecurringTransactionStore()
    service.listRecurringTransactionOccurrences.mockResolvedValueOnce({
      items: [{ id: 9, scheduled_date: '2026-10-05', status: 'pending', removed_at: null }],
      meta: { total: 1, current_page: 1, last_page: 1 },
    })

    await store.select(4)

    expect(store.selected.description).toBe('Aluguel')
    expect(store.occurrences).toHaveLength(1)
    expect(store.occurrenceMeta.total).toBe(1)
  })

  it('runs lifecycle actions with durable notices', async () => {
    const store = useRecurringTransactionStore()

    await store.pause(4)
    expect(store.notice).toBe('recurringTransactions.pausedSuccess')
    await store.resume(4)
    expect(store.notice).toBe('recurringTransactions.resumedSuccess')
    await store.end(4)
    expect(store.notice).toBe('recurringTransactions.endedSuccess')
  })
})
