import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/transactionService', () => ({
  createTransaction: vi.fn(), getTransaction: vi.fn(), listFinancialHistory: vi.fn(), removeTransaction: vi.fn(), restoreTransaction: vi.fn(), updateTransaction: vi.fn(),
}))
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => ({ fetchAccounts: vi.fn().mockResolvedValue(), fetchSummary: vi.fn().mockResolvedValue() }),
}))

const service = await import('@/services/transactionService')
const { useTransactionStore } = await import('../transactionStore')

describe('transactionStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); service.listFinancialHistory.mockResolvedValue({ items: [], meta: { total: 0, current_page: 1, last_page: 1 }, links: {} }) })

  it('keeps filter state and resets to first page', async () => {
    const store = useTransactionStore()
    await store.setFilters({ q: 'almoço', type: 'expense' })
    expect(store.filters).toMatchObject({ q: 'almoço', type: 'expense', page: 1 })
    expect(service.listFinancialHistory).toHaveBeenCalledWith(expect.objectContaining({ q: 'almoço', type: 'expense', page: 1 }))
  })

  it('prevents duplicate mutation while a create request is pending', async () => {
    let resolveCreate
    service.createTransaction.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve }))
    const store = useTransactionStore()
    const first = store.create({ description: 'Receita' })
    await expect(store.create({ description: 'Receita' })).resolves.toBeNull()
    resolveCreate({ id: 1 })
    await first
    expect(service.createTransaction).toHaveBeenCalledTimes(1)
  })

  it('reuses the idempotency key when the same mutation is retried after a request failure', async () => {
    service.createTransaction.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ id: 1 })
    const store = useTransactionStore()
    const payload = { description: 'Receita' }

    await expect(store.create(payload)).rejects.toThrow('Network unavailable')
    await store.create(payload)

    const firstKey = service.createTransaction.mock.calls[0][1]
    expect(service.createTransaction.mock.calls[1][1]).toBe(firstKey)
  })

  it('normalizes income and expense history entries while keeping transfers discriminated', async () => {
    service.listFinancialHistory.mockResolvedValue({
      items: [
        {
          movement_kind: 'income',
          id: 1,
          amount_centavos: 500,
          movement_date: '2026-09-13',
          status: 'effective',
          financial_account: { id: 1, name: 'Conta principal', status: 'active' },
          category: { id: 2, name: 'Salário' },
        },
        {
          movement_kind: 'transfer',
          id: 3,
          amount_centavos: 900,
          movement_date: '2026-09-12',
          status: 'effective',
          source_financial_account: { id: 1, name: 'Conta principal', status: 'active' },
          destination_financial_account: { id: 4, name: 'Poupança', status: 'active' },
          category: null,
        },
      ],
      meta: { total: 2, current_page: 1, last_page: 1, totals: { income_centavos: 500 } },
      links: {},
    })
    const store = useTransactionStore()

    await store.fetch()

    expect(store.items[0]).toMatchObject({ type: 'income', transaction_date: '2026-09-13' })
    expect(store.items[1]).toMatchObject({ movement_kind: 'transfer' })
    expect(store.items[1].type).toBeUndefined()
    expect(store.totals).toEqual({ income_centavos: 500 })
  })

  it('selects a transfer entry without refetching it as a transaction', async () => {
    const store = useTransactionStore()
    const entry = { movement_kind: 'transfer', id: 3 }

    await expect(store.select(entry)).resolves.toEqual(entry)
    expect(service.getTransaction).not.toHaveBeenCalled()
  })

  it('refreshes transactions after create, update, removal, and restore', async () => {
    service.createTransaction.mockResolvedValue({ id: 1 }); service.updateTransaction.mockResolvedValue({ id: 1 }); service.removeTransaction.mockResolvedValue({ id: 1 }); service.restoreTransaction.mockResolvedValue({ id: 1 })
    const store = useTransactionStore()
    await store.create({}); await store.update(1, {}); await store.remove(1); await store.restore(1, {})
    expect(service.listFinancialHistory).toHaveBeenCalledTimes(4)
  })
})
