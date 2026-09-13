import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const service = vi.hoisted(() => ({
  createTransaction: vi.fn(),
  getTransaction: vi.fn(),
  listTransactions: vi.fn(),
  removeTransaction: vi.fn(),
  restoreTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}))
const accounts = vi.hoisted(() => ({
  accounts: [],
  fetchAccounts: vi.fn(),
  fetchSummary: vi.fn(),
}))

vi.mock('@/services/transactionService', () => service)
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => accounts,
}))

const { useTransactionStore } = await import('../transactionStore')

describe('transactionStore balance feedback', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    accounts.accounts = [{ id: 1, name: 'Conta principal', current_balance_centavos: 1_000 }]
    service.listTransactions.mockResolvedValue({
      items: [],
      meta: { total: 0, current_page: 1, last_page: 1 },
      links: {},
    })
    accounts.fetchAccounts.mockImplementation(async () => {
      accounts.accounts = [
        { id: 1, name: 'Conta principal', current_balance_centavos: 800 },
      ]

      return accounts.accounts
    })
    accounts.fetchSummary.mockResolvedValue({ active_combined_balance_centavos: 800 })
  })

  it('refreshes the accounts store and its summary after every mutation', async () => {
    service.createTransaction.mockResolvedValue({ transaction: { id: 1 }, meta: {} })
    service.updateTransaction.mockResolvedValue({ transaction: { id: 1 }, meta: {} })
    service.removeTransaction.mockResolvedValue({ transaction: { id: 1 }, meta: {} })
    service.restoreTransaction.mockResolvedValue({ transaction: { id: 1 }, meta: {} })
    const store = useTransactionStore()

    await store.create({})
    await store.update(1, {})
    await store.remove(1)
    await store.restore(1, {})

    expect(accounts.fetchAccounts).toHaveBeenCalledTimes(4)
    expect(accounts.fetchSummary).toHaveBeenCalledTimes(4)
    expect(service.listTransactions).toHaveBeenCalledTimes(4)
  })

  it('reports the balance impact per affected account', async () => {
    service.createTransaction.mockResolvedValue({ transaction: { id: 1 }, meta: {} })
    const store = useTransactionStore()

    await store.create({ amount_centavos: 200 })

    expect(store.lastBalanceImpact).toEqual([
      { id: 1, name: 'Conta principal', before: 1_000, after: 800, delta: -200 },
    ])
  })

  it('keeps the typed server notice returned by a mutation', async () => {
    service.updateTransaction.mockResolvedValue({
      transaction: { id: 1 },
      meta: { notice: { code: 'effective_future_date', message: 'Permanece efetiva.' } },
    })
    const store = useTransactionStore()

    await store.update(1, {})

    expect(store.notice).toEqual({
      code: 'effective_future_date',
      message: 'Permanece efetiva.',
    })
  })

  it('clears stale notice and balance impact before the next mutation', async () => {
    service.createTransaction.mockResolvedValue({
      transaction: { id: 1 },
      meta: { notice: { code: 'effective_future_date', message: 'Permanece efetiva.' } },
    })
    const store = useTransactionStore()
    await store.create({})
    expect(store.notice).not.toBeNull()
    expect(store.lastBalanceImpact).not.toHaveLength(0)

    store.clearNotice()

    expect(store.notice).toBeNull()
    expect(store.lastBalanceImpact).toEqual([])
  })
})
