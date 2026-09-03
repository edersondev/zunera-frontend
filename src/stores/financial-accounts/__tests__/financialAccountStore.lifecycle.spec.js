import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/financialAccountService', () => ({
  archiveFinancialAccount: vi.fn(),
  restoreFinancialAccount: vi.fn(),
  getFinancialAccountSummary: vi.fn(),
  listFinancialAccounts: vi.fn(),
  createFinancialAccount: vi.fn(),
  updateFinancialAccount: vi.fn(),
  getFinancialAccount: vi.fn(),
}))

const service = await import('@/services/financialAccountService')
const { useFinancialAccountStore } = await import('../financialAccountStore')

const active = { id: 1, name: 'Conta', status: 'active' }
const archived = { id: 1, name: 'Conta', status: 'archived' }
const emptySummary = { active_account_count: 0, active_combined_balance_centavos: 0, currency_code: 'BRL' }

describe('financialAccountStore lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('moves an account to the archived list and refreshes the summary', async () => {
    service.listFinancialAccounts.mockResolvedValueOnce([active])
    service.archiveFinancialAccount.mockResolvedValue(archived)
    service.getFinancialAccountSummary.mockResolvedValue(emptySummary)

    const store = useFinancialAccountStore()
    await store.fetchAccounts()
    await store.archive(active)

    expect(store.accounts).toEqual([])
    expect(store.archivedAccounts).toEqual([archived])
    expect(service.getFinancialAccountSummary).toHaveBeenCalledTimes(1)
  })

  it('moves an archived account back to active on restore', async () => {
    service.listFinancialAccounts.mockResolvedValueOnce([archived])
    service.restoreFinancialAccount.mockResolvedValue(active)
    service.getFinancialAccountSummary.mockResolvedValue(emptySummary)

    const store = useFinancialAccountStore()
    await store.fetchAccounts('archived')
    await store.restore(archived)

    expect(store.archivedAccounts).toEqual([])
    expect(store.accounts).toEqual([active])
  })

  it('keeps conflict feedback for repeated lifecycle actions', async () => {
    const conflict = Object.assign(new Error('Already archived.'), {
      status: 409,
      code: 'account_already_archived',
      errors: {},
    })
    service.archiveFinancialAccount.mockRejectedValue(conflict)

    const store = useFinancialAccountStore()
    await expect(store.archive(active)).rejects.toBe(conflict)
    expect(store.error.code).toBe('account_already_archived')
  })
})
