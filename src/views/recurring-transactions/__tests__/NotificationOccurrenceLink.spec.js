import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { notificationDestination } from '@/services/notificationDestination'

vi.mock('@/services/recurringTransactionService', () => ({
  confirmCardOccurrence: vi.fn(), createRecurringTransaction: vi.fn(), dismissCardOccurrence: vi.fn(),
  endRecurringTransaction: vi.fn(), getRecurringTransaction: vi.fn(),
  listRecurringTransactionOccurrences: vi.fn(), listRecurringTransactions: vi.fn(),
  pauseRecurringTransaction: vi.fn(), retryCardOccurrence: vi.fn(), resumeRecurringTransaction: vi.fn(),
  updateRecurringTransaction: vi.fn(),
}))
const service = await import('@/services/recurringTransactionService')
const { useRecurringTransactionStore } = await import('@/stores/recurring-transactions/recurringTransactionStore')

describe('exact occurrence link', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('finds the requested old failed occurrence rather than the newest reviewable one', async () => {
    const store = useRecurringTransactionStore()
    store.selected = { id: 7 }
    store.occurrences = [{ id: 99, state: 'expected' }]
    store.occurrenceMeta = { last_page: 2 }
    service.listRecurringTransactionOccurrences.mockResolvedValue({ items: [{ id: 42, state: 'failed' }], meta: { last_page: 2 } })
    await expect(store.findOccurrenceById(7, 42)).resolves.toMatchObject({ id: 42, state: 'failed' })
    expect(service.listRecurringTransactionOccurrences).toHaveBeenCalledWith(7, { per_page: 50, page: 2 })
    expect(notificationDestination({ kind: 'recurring_card_occurrence', params: { rule_id: 7, occurrence_id: 42 } })).toEqual({
      name: 'recurring-transactions', query: { highlight: '7', occurrence_id: '42' },
    })
  })

  it('does not substitute a different occurrence when target is missing', async () => {
    const store = useRecurringTransactionStore()
    store.selected = { id: 7 }
    store.occurrences = [{ id: 99, state: 'expected' }]
    store.occurrenceMeta = { last_page: 1 }
    await expect(store.findOccurrenceById(7, 42)).resolves.toBeNull()
  })
})
