import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/transactionService', () => ({
  createTransaction: vi.fn(), getTransaction: vi.fn(), listTransactions: vi.fn(), removeTransaction: vi.fn(), restoreTransaction: vi.fn(), updateTransaction: vi.fn(),
}))
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => ({ fetchAccounts: vi.fn().mockResolvedValue(), fetchSummary: vi.fn().mockResolvedValue() }),
}))

const service = await import('@/services/transactionService')
const { useTransactionStore } = await import('../transactionStore')

describe('transactionStore', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks(); service.listTransactions.mockResolvedValue({ items: [], meta: { total: 0, current_page: 1, last_page: 1 }, links: {} }) })

  it('keeps filter state and resets to first page', async () => {
    const store = useTransactionStore()
    await store.setFilters({ q: 'almoço', type: 'expense' })
    expect(store.filters).toMatchObject({ q: 'almoço', type: 'expense', page: 1 })
    expect(service.listTransactions).toHaveBeenCalledWith(expect.objectContaining({ q: 'almoço', type: 'expense', page: 1 }))
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

  it('refreshes transactions after create, update, removal, and restore', async () => {
    service.createTransaction.mockResolvedValue({ id: 1 }); service.updateTransaction.mockResolvedValue({ id: 1 }); service.removeTransaction.mockResolvedValue({ id: 1 }); service.restoreTransaction.mockResolvedValue({ id: 1 })
    const store = useTransactionStore()
    await store.create({}); await store.update(1, {}); await store.remove(1); await store.restore(1, {})
    expect(service.listTransactions).toHaveBeenCalledTimes(4)
  })
})
