import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/financialAccountService', () => ({
  getFinancialAccount: vi.fn(),
  getFinancialAccountSummary: vi.fn(),
  updateFinancialAccount: vi.fn(),
  listFinancialAccounts: vi.fn(),
  createFinancialAccount: vi.fn(),
  archiveFinancialAccount: vi.fn(),
  restoreFinancialAccount: vi.fn(),
}))

const service = await import('@/services/financialAccountService')
const { useFinancialAccountStore } = await import('../financialAccountStore')

describe('financialAccountStore detail and update', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the selected account detail', async () => {
    const account = { id: 9, name: 'Conta' }
    service.getFinancialAccount.mockResolvedValue(account)

    const store = useFinancialAccountStore()
    await store.fetchAccount(9)

    expect(store.selectedAccount).toEqual(account)
    expect(service.getFinancialAccount).toHaveBeenCalledWith(9)
  })

  it('updates account lists and summary after a successful update', async () => {
    const original = { id: 5, name: 'Antiga', status: 'active' }
    const updated = { id: 5, name: 'Nova', status: 'active' }
    service.listFinancialAccounts.mockResolvedValueOnce([original])
    service.updateFinancialAccount.mockResolvedValue(updated)
    service.getFinancialAccountSummary.mockResolvedValue({
      active_account_count: 1,
      active_combined_balance_centavos: 2500,
      currency_code: 'BRL',
    })

    const store = useFinancialAccountStore()
    await store.fetchAccounts()
    await store.fetchAccount(5)
    await store.update(5, { name: 'Nova' })

    expect(store.selectedAccount).toEqual(updated)
    expect(store.accounts).toEqual([updated])
    expect(store.summary.active_combined_balance_centavos).toBe(2500)
  })

  it('surfaces conflict codes and field errors without losing state', async () => {
    const original = { id: 5, name: 'Conta', status: 'active' }
    service.listFinancialAccounts.mockResolvedValueOnce([original])
    service.getFinancialAccountSummary.mockResolvedValue({
      active_account_count: 1,
      active_combined_balance_centavos: 0,
      currency_code: 'BRL',
    })
    const conflict = Object.assign(new Error('Conflict.'), {
      status: 409,
      code: 'account_name_conflict',
      errors: {},
    })
    service.updateFinancialAccount.mockRejectedValue(conflict)

    const store = useFinancialAccountStore()
    await store.fetchAccounts()

    await expect(store.update(5, { name: 'Duplicate' })).rejects.toBe(conflict)
    expect(store.error.code).toBe('account_name_conflict')
    expect(store.accounts).toEqual([original])
  })
})
