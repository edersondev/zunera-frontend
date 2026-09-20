import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/creditCardService', () => ({
  listCards: vi.fn(),
  getCard: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  archiveCard: vi.fn(),
  listStatements: vi.fn(),
  getStatement: vi.fn(),
  listPurchases: vi.fn(),
  createPurchase: vi.fn(),
  createPayment: vi.fn(),
  updatePayment: vi.fn(),
  removePayment: vi.fn(),
  restorePayment: vi.fn(),
  createCreditEvent: vi.fn(),
  getDashboardCards: vi.fn(),
  newIdempotencyKey: vi.fn(() => 'generated-key'),
  isOverLimitConfirmation: vi.fn((error) => error?.code === 'OVER_LIMIT_CONFIRMATION_REQUIRED'),
  overLimitResultingCentavos: vi.fn((error) => error?.payload?.resulting_available_credit?.amount_centavos ?? 0),
}))

const service = await import('@/services/creditCardService')
const { useCreditCardStore } = await import('../creditCardStore')

const activeCard = {
  id: 7,
  name: 'Nubank',
  status: 'active',
  summary: { used_credit: { amount_centavos: 20_000 }, card_credit: { amount_centavos: 0 } },
  current_statement: { id: null, status: 'open', is_current: true },
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  service.listCards.mockResolvedValue([activeCard])
  service.getCard.mockResolvedValue(activeCard)
  service.createPurchase.mockResolvedValue({ id: 3 })
  service.createCard.mockResolvedValue(activeCard)
})

describe('creditCardStore', () => {
  it('loads active and archived cards separately', async () => {
    const store = useCreditCardStore()
    service.listCards.mockResolvedValueOnce([activeCard]).mockResolvedValueOnce([{ id: 9, status: 'archived' }])

    await store.fetchCards()
    await store.fetchCards('archived')

    expect(store.cards).toEqual([activeCard])
    expect(store.archivedCards).toEqual([{ id: 9, status: 'archived' }])
    expect(service.listCards).toHaveBeenNthCalledWith(1, 'active')
    expect(service.listCards).toHaveBeenNthCalledWith(2, 'archived')
  })

  it('exposes the current statement and derived credit split without computing money', async () => {
    const store = useCreditCardStore()
    service.getCard.mockResolvedValue(activeCard)

    await store.fetchCard(7)

    expect(store.currentStatement).toMatchObject({ id: null, is_current: true })
    expect(store.history).toEqual({ usedCentavos: 20_000, cardCreditCentavos: 0 })
  })

  it('creates and archives cards through generated keys', async () => {
    const store = useCreditCardStore()
    service.archiveCard.mockResolvedValue({ ...activeCard, status: 'archived' })

    const created = await store.saveCard({ name: 'Nubank' })
    const archived = await store.archiveCard(7)

    expect(created.ok).toBe(true)
    expect(archived.ok).toBe(true)
    expect(service.createCard).toHaveBeenCalledWith({ name: 'Nubank' }, 'generated-key')
    expect(service.archiveCard).toHaveBeenCalledWith(7, 'generated-key')
    expect(store.card.status).toBe('archived')
  })

  it('turns a confirmation-required outcome into a pending over-limit state', async () => {
    const store = useCreditCardStore()
    service.createPurchase.mockRejectedValueOnce({
      code: 'OVER_LIMIT_CONFIRMATION_REQUIRED',
      payload: { resulting_available_credit: { amount_centavos: -50_000 } },
    })

    const outcome = await store.submitPurchase(7, { total_amount_centavos: 150_000 })

    expect(outcome.overLimit).toBe(true)
    expect(outcome.resultingCentavos).toBe(-50_000)
    expect(store.pendingOverLimit).toMatchObject({ cardId: 7, resultingCentavos: -50_000 })
    expect(store.mutationError).toBeNull()
  })

  it('resubmits a confirmed over-limit purchase with a fresh key and confirmation echo', async () => {
    const store = useCreditCardStore()
    service.createPurchase.mockRejectedValueOnce({
      code: 'OVER_LIMIT_CONFIRMATION_REQUIRED',
      payload: { resulting_available_credit: { amount_centavos: -50_000 } },
    })
    await store.submitPurchase(7, { total_amount_centavos: 150_000 })

    service.createPurchase.mockResolvedValueOnce({ id: 5 })
    const confirmed = await store.submitOverLimit()

    expect(confirmed.ok).toBe(true)
    expect(store.pendingOverLimit).toBeNull()
    expect(service.createPurchase).toHaveBeenLastCalledWith(
      7,
      {
        total_amount_centavos: 150_000,
        confirm_over_limit: true,
        expected_available_credit_centavos: 100_000,
      },
      'generated-key',
    )
  })

  it('keeps mutation failures as typed errors instead of dropping them', async () => {
    const store = useCreditCardStore()
    service.createCard.mockRejectedValueOnce({ code: 'idempotency_key_reused', status: 409 })

    const outcome = await store.saveCard({ name: 'Nubank' })

    expect(outcome.ok).toBe(false)
    expect(store.mutationError).toMatchObject({ code: 'idempotency_key_reused' })
    expect(store.submitting).toBe(false)
  })

  it('refreshes the statement snapshot after payment lifecycle mutations', async () => {
    const store = useCreditCardStore()
    service.createPayment.mockResolvedValue({ payment: { id: 11 }, statement: { id: 9, status: 'paid' }, card: activeCard })
    service.removePayment.mockResolvedValue({ payment: { id: 11, is_removed: true }, statement: { id: 9, status: 'overdue' }, card: activeCard })

    await store.submitPayment(9, { amount_centavos: 1_000 })
    expect(store.statement).toMatchObject({ id: 9, status: 'paid' })

    await store.removeStatementPayment(11)
    expect(store.statement).toMatchObject({ id: 9, status: 'overdue' })
    expect(store.card).toEqual(activeCard)
  })

  it('loads the additive dashboard projection', async () => {
    const store = useCreditCardStore()
    service.getDashboardCards.mockResolvedValue({ outstanding_obligation: { amount_centavos: 30_000 }, upcoming_statements: [{ id: 9 }] })

    await store.fetchDashboard()

    expect(store.upcomingStatements).toEqual([{ id: 9 }])
  })
})
