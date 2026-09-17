import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const accountStore = vi.hoisted(() => ({
  accounts: [],
  fetchAccounts: vi.fn().mockResolvedValue(),
  fetchSummary: vi.fn().mockResolvedValue(),
}))

vi.mock('@/services/transferService', () => ({
  createTransfer: vi.fn(),
  getTransfer: vi.fn(),
  listTransfers: vi.fn(),
  removeTransfer: vi.fn(),
  restoreTransfer: vi.fn(),
  updateTransfer: vi.fn(),
}))
vi.mock('@/stores/financial-accounts/financialAccountStore', () => ({
  useFinancialAccountStore: () => accountStore,
}))

const service = await import('@/services/transferService')
const { useTransferStore } = await import('../transferStore')

describe('transferStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    accountStore.accounts = []
    accountStore.fetchAccounts.mockResolvedValue()
    accountStore.fetchSummary.mockResolvedValue()
    service.listTransfers.mockResolvedValue({
      items: [],
      meta: { total: 0, current_page: 1, last_page: 1 },
      links: {},
    })
  })

  it('keeps filter state and always resets to the first page', async () => {
    const store = useTransferStore()

    await store.setFilters({ status: 'pending', source_financial_account_id: 3 })

    expect(store.filters).toMatchObject({ status: 'pending', source_financial_account_id: 3, page: 1 })
    expect(service.listTransfers).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', source_financial_account_id: 3, page: 1 }),
    )
  })

  it('prevents duplicate mutations while a request is in flight', async () => {
    let resolveCreate
    service.createTransfer.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )
    const store = useTransferStore()
    const first = store.create({ amount_centavos: 100 })

    await expect(store.create({ amount_centavos: 100 })).resolves.toBeNull()
    resolveCreate({ transfer: { id: 1 }, meta: {} })
    await first

    expect(service.createTransfer).toHaveBeenCalledTimes(1)
  })

  it('reuses the idempotency key only when the same mutation is retried after a failure', async () => {
    service.createTransfer
      .mockRejectedValueOnce(new Error('Rede indisponível'))
      .mockResolvedValueOnce({ transfer: { id: 1 }, meta: {} })
    const store = useTransferStore()
    const payload = { amount_centavos: 100 }

    await expect(store.create(payload)).rejects.toThrow('Rede indisponível')
    await store.create(payload)

    expect(service.createTransfer.mock.calls[1][1]).toBe(service.createTransfer.mock.calls[0][1])
  })

  it('refreshes transfers, accounts, and the summary after every mutation', async () => {
    service.createTransfer.mockResolvedValue({ transfer: { id: 1 }, meta: {} })
    service.updateTransfer.mockResolvedValue({ transfer: { id: 1 }, meta: {} })
    service.removeTransfer.mockResolvedValue({ transfer: { id: 1 }, meta: {} })
    service.restoreTransfer.mockResolvedValue({ transfer: { id: 1 }, meta: {} })
    const store = useTransferStore()

    await store.create({})
    await store.update(1, {})
    await store.remove(1)
    await store.restore(1, {})

    expect(service.listTransfers).toHaveBeenCalledTimes(4)
    expect(accountStore.fetchAccounts).toHaveBeenCalledTimes(4)
    expect(accountStore.fetchSummary).toHaveBeenCalledTimes(4)
  })

  it('reports both refreshed account sides and the typed notice after a mutation', async () => {
    accountStore.accounts = [
      { id: 1, name: 'Corrente', current_balance_centavos: 500_000 },
      { id: 2, name: 'Poupança', current_balance_centavos: 200_000 },
      { id: 3, name: 'Sem movimento', current_balance_centavos: 0 },
    ]
    service.createTransfer.mockImplementation(async () => {
      accountStore.accounts = [
        { id: 1, name: 'Corrente', current_balance_centavos: 400_000 },
        { id: 2, name: 'Poupança', current_balance_centavos: 300_000 },
        { id: 3, name: 'Sem movimento', current_balance_centavos: 0 },
      ]

      return { transfer: { id: 9 }, meta: { notice: { code: 'effective_future_date', message: 'Efetiva.' } } }
    })
    const store = useTransferStore()

    await store.create({ amount_centavos: 100_000 })

    expect(store.notice).toMatchObject({ code: 'effective_future_date' })
    expect(store.lastBalanceImpact).toEqual([
      { id: 1, name: 'Corrente', before: 500_000, after: 400_000, delta: -100_000 },
      { id: 2, name: 'Poupança', before: 200_000, after: 300_000, delta: 100_000 },
    ])
  })

  it('selects a transfer and loads the next batch progressively', async () => {
    service.getTransfer.mockResolvedValue({ id: 4 })
    service.listTransfers.mockResolvedValue({
      items: [{ id: 4 }],
      meta: { total: 60, current_page: 2, last_page: 2 },
      links: {},
    })
    const store = useTransferStore()
    store.items = [{ id: 1 }]
    store.meta = { total: 60, current_page: 1, last_page: 2 }

    await expect(store.select(4)).resolves.toEqual({ id: 4 })
    await store.loadMore()

    expect(store.items.map((item) => item.id)).toEqual([1, 4])
    expect(store.hasMore).toBe(false)
  })

  it('clears persisted feedback and balance impacts', () => {
    const store = useTransferStore()
    store.error = { message: 'Falha' }
    store.validationErrors = { amount_centavos: ['Inválido'] }
    store.notice = { message: 'Aviso' }
    store.lastBalanceImpact = [{ id: 1 }]

    store.clearFeedback()

    expect(store.error).toBeNull()
    expect(store.validationErrors).toEqual({})
    expect(store.notice).toBeNull()
    expect(store.lastBalanceImpact).toEqual([])
  })
})
