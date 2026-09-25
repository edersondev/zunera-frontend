import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/recurringTransactionService', () => ({
  confirmCardOccurrence: vi.fn(),
  createRecurringTransaction: vi.fn(),
  dismissCardOccurrence: vi.fn(),
  endRecurringTransaction: vi.fn(),
  getRecurringTransaction: vi.fn(),
  listRecurringTransactionOccurrences: vi.fn(),
  listRecurringTransactions: vi.fn(),
  pauseRecurringTransaction: vi.fn(),
  retryCardOccurrence: vi.fn(),
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
    service.confirmCardOccurrence.mockResolvedValue({ occurrence: { id: 9, state: 'recorded' } })
    service.dismissCardOccurrence.mockResolvedValue({ occurrence: { id: 9, state: 'dismissed' } })
    service.retryCardOccurrence.mockResolvedValue({ occurrence: { id: 9, state: 'recorded' } })
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

  it('confirms, dismisses, and retries an occurrence through the action service', async () => {
    const store = useRecurringTransactionStore()

    const confirmed = await store.confirmOccurrence(4, 9, { actual_amount_centavos: 16500 })
    const dismissed = await store.dismissOccurrence(4, 9)
    const retried = await store.retryOccurrence(4, 9)

    expect(confirmed.state).toBe('recorded')
    expect(dismissed.state).toBe('dismissed')
    expect(retried.state).toBe('recorded')
    expect(service.confirmCardOccurrence).toHaveBeenCalledWith(4, 9, { actual_amount_centavos: 16500 }, expect.any(String))
    expect(service.dismissCardOccurrence).toHaveBeenCalledWith(4, 9, expect.any(String))
    expect(service.retryCardOccurrence).toHaveBeenCalledWith(4, 9, expect.any(String))
  })

  it('reuses a transport retry key but gives a changed confirmation choice a fresh key', async () => {
    const store = useRecurringTransactionStore()
    service.confirmCardOccurrence.mockRejectedValueOnce(Object.assign(new Error('Offline'), { status: 0 }))

    await expect(store.confirmOccurrence(4, 9, { actual_amount_centavos: 16500 })).rejects.toThrow('Offline')
    const firstKey = service.confirmCardOccurrence.mock.calls[0][3]
    await store.confirmOccurrence(4, 9, { actual_amount_centavos: 16500 })
    expect(service.confirmCardOccurrence.mock.calls[1][3]).toBe(firstKey)

    await store.confirmOccurrence(4, 9, { actual_amount_centavos: 17000 })
    expect(service.confirmCardOccurrence.mock.calls[2][3]).not.toBe(firstKey)
  })

  it('keeps a failed confirmation readable and gives a 409 retry a fresh key', async () => {
    const store = useRecurringTransactionStore()
    service.confirmCardOccurrence.mockResolvedValueOnce({ occurrence: {
      id: 9, state: 'failed', actual_amount_centavos: 16500, actual_purchase_date: '2026-09-13',
    } })
    const failed = await store.confirmOccurrence(4, 9, { actual_amount_centavos: 16500 })
    expect(failed.state).toBe('failed')
    expect(failed.actual_amount_centavos).toBe(16500)

    const conflict = Object.assign(new Error('Action in progress'), { status: 409, code: 'occurrence_action_in_progress' })
    service.confirmCardOccurrence.mockRejectedValueOnce(conflict)
    await expect(store.confirmOccurrence(4, 9, {})).rejects.toBe(conflict)
    const conflictKey = service.confirmCardOccurrence.mock.calls[1][3]
    expect(store.error.code).toBe('occurrence_action_in_progress')

    await store.confirmOccurrence(4, 9, {})
    expect(service.confirmCardOccurrence.mock.calls[2][3]).not.toBe(conflictKey)
  })

  it('keeps automatic failures retryable and exposes typed stale-credit feedback', async () => {
    const store = useRecurringTransactionStore()
    service.retryCardOccurrence.mockResolvedValueOnce({ occurrence: { id: 9, state: 'failed', failure_code: 'purchase_recording_failed' } })
    const failed = await store.retryOccurrence(4, 9)
    expect(failed.state).toBe('failed')
    const firstRetryKey = service.retryCardOccurrence.mock.calls[0][2]

    await store.retryOccurrence(4, 9)
    expect(service.retryCardOccurrence.mock.calls[1][2]).not.toBe(firstRetryKey)

    const stale = Object.assign(new Error('Credit changed'), { status: 409, code: 'stale_over_limit_confirmation' })
    service.confirmCardOccurrence.mockRejectedValueOnce(stale)
    await expect(store.confirmOccurrence(4, 9, {
      confirm_over_limit: true, expected_available_credit_centavos: 1000,
    })).rejects.toBe(stale)
    expect(store.error.code).toBe('stale_over_limit_confirmation')
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

  it('clears form validation errors without removing a success notice', async () => {
    const store = useRecurringTransactionStore()
    const failure = Object.assign(new Error('Invalid'), {
      errors: { description: ['Informe uma descrição.'] },
    })
    service.createRecurringTransaction.mockRejectedValueOnce(failure)

    await expect(store.create({ description: '' })).rejects.toThrow('Invalid')
    store.notice = 'recurringTransactions.created'

    store.clearValidationErrors()

    expect(store.error).toBeNull()
    expect(store.validationErrors).toEqual({})
    expect(store.notice).toBe('recurringTransactions.created')
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

  it('updates the listed review count when refreshed rule detail changes', async () => {
    const store = useRecurringTransactionStore()
    const pendingRule = { ...rule, reviewable_occurrence_count: 1 }
    service.listRecurringTransactions.mockResolvedValueOnce({
      items: [pendingRule],
      meta: { total: 1, current_page: 1, last_page: 1 },
    })
    service.getRecurringTransaction.mockResolvedValueOnce({ ...pendingRule, reviewable_occurrence_count: 0 })

    await store.fetch()
    await store.select(rule.id)

    expect(store.items[0].reviewable_occurrence_count).toBe(0)
    expect(service.listRecurringTransactions).toHaveBeenCalledTimes(1)
  })

  it('loads the next page and appends it to current items', async () => {
    const store = useRecurringTransactionStore()
    await store.fetch()
    service.listRecurringTransactions.mockResolvedValueOnce({
      items: [{ id: 5, description: 'Internet' }],
      meta: { total: 2, current_page: 2, last_page: 2 },
      links: {},
    })

    await store.loadMore()

    expect(service.listRecurringTransactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, per_page: 50 }),
    )
    expect(store.items).toEqual([rule, { id: 5, description: 'Internet' }])
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
