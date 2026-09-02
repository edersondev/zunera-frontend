import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/financialAccountService', () => ({
  listFinancialAccounts: vi.fn(),
  getFinancialAccountSummary: vi.fn(),
  createFinancialAccount: vi.fn(),
  updateFinancialAccount: vi.fn(),
  archiveFinancialAccount: vi.fn(),
  restoreFinancialAccount: vi.fn(),
  getFinancialAccount: vi.fn(),
}))

const service = await import('@/services/financialAccountService')
const { useFinancialAccountStore } = await import('../financialAccountStore')

const activeAccount = { id: 1, name: 'Conta principal', status: 'active' }
const archivedAccount = { id: 2, name: 'Reserva', status: 'archived' }
const emptySummary = { active_account_count: 0, active_combined_balance_centavos: 0, currency_code: 'BRL' }

describe('financialAccountStore create and list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads active and archived account lists into separate collections', async () => {
    service.listFinancialAccounts.mockResolvedValueOnce([activeAccount])
    service.listFinancialAccounts.mockResolvedValueOnce([archivedAccount])

    const store = useFinancialAccountStore()
    await store.fetchAccounts('active')
    await store.fetchAccounts('archived')

    expect(store.accounts).toEqual([activeAccount])
    expect(store.archivedAccounts).toEqual([archivedAccount])
  })

  it('creates an account, prepends it, and refreshes the summary', async () => {
    service.createFinancialAccount.mockResolvedValue(activeAccount)
    service.getFinancialAccountSummary.mockResolvedValue({
      active_account_count: 1,
      active_combined_balance_centavos: 1000,
      currency_code: 'BRL',
    })

    const store = useFinancialAccountStore()
    const created = await store.create({ name: 'Conta principal' })

    expect(created).toEqual(activeAccount)
    expect(store.accounts).toEqual([activeAccount])
    expect(store.summary.active_account_count).toBe(1)
    expect(service.getFinancialAccountSummary).toHaveBeenCalledTimes(1)
  })

  it('suppresses duplicate create submissions while one request is in flight', async () => {
    let resolveCreate
    service.createFinancialAccount.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )
    service.getFinancialAccountSummary.mockResolvedValue(emptySummary)

    const store = useFinancialAccountStore()
    const first = store.create({ name: 'Conta principal' })
    const second = store.create({ name: 'Conta principal' })

    expect(service.createFinancialAccount).toHaveBeenCalledTimes(1)
    await expect(second).resolves.toBeNull()

    resolveCreate(activeAccount)
    await first

    expect(store.accounts).toHaveLength(1)
  })

  it('keeps server validation errors available to forms', async () => {
    const requestError = Object.assign(new Error('Validation failed.'), {
      errors: { name: ['An active account with this name already exists.'] },
    })
    service.createFinancialAccount.mockRejectedValue(requestError)
    const store = useFinancialAccountStore()

    await expect(store.create({ name: 'Duplicate' })).rejects.toBe(requestError)
    expect(store.validationErrors.name).toEqual(['An active account with this name already exists.'])
  })
})
