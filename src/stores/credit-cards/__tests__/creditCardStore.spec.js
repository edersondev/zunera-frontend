import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/creditCardService', () => ({
  listCards: vi.fn(),
  getCard: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  archiveCard: vi.fn(),
  restoreCard: vi.fn(),
  listStatements: vi.fn(),
  getStatement: vi.fn(),
  listPurchases: vi.fn(),
  createPurchase: vi.fn(),
  updatePurchase: vi.fn(),
  createPayment: vi.fn(),
  updatePayment: vi.fn(),
  removePayment: vi.fn(),
  restorePayment: vi.fn(),
  createCreditEvent: vi.fn(),
  getDashboardCards: vi.fn(),
  newIdempotencyKey: vi.fn(() => 'generated-key'),
  isOverLimitConfirmation: vi.fn((error) => error?.code === 'OVER_LIMIT_CONFIRMATION_REQUIRED'),
  overLimitResultingCentavos: vi.fn(
    (error) => error?.payload?.resulting_available_credit?.amount_centavos ?? 0,
  ),
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
    service.listCards
      .mockResolvedValueOnce([activeCard])
      .mockResolvedValueOnce([{ id: 9, status: 'archived' }])

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

  it('restores an archived card, removes it from the archived snapshot, and refreshes active cards', async () => {
    const store = useCreditCardStore()
    const archivedCard = { ...activeCard, status: 'archived' }
    const restoredCard = { ...activeCard, status: 'active' }
    store.archivedCards = [archivedCard]
    service.restoreCard.mockResolvedValue(restoredCard)

    const outcome = await store.restoreCard(7)

    expect(outcome).toEqual({ ok: true, result: restoredCard })
    expect(service.restoreCard).toHaveBeenCalledWith(7, 'generated-key')
    expect(store.archivedCards).toEqual([])
    expect(store.cards).toEqual([activeCard])
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
    service.newIdempotencyKey
      .mockReturnValueOnce('initial-key')
      .mockReturnValueOnce('confirmation-key')
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
      'confirmation-key',
    )
    expect(service.createPurchase).toHaveBeenNthCalledWith(
      1,
      7,
      { total_amount_centavos: 150_000 },
      'initial-key',
    )
  })

  it('keeps purchase statement assignments and category errors in explicit client state', async () => {
    const store = useCreditCardStore()
    const purchase = {
      id: 3,
      category: { id: 18, name: 'Technology' },
      installments: [{ sequence: 1, statement: { id: 9, closing_date: '2026-10-10' } }],
    }
    service.createPurchase.mockResolvedValueOnce(purchase)

    const saved = await store.submitPurchase(7, {
      category_id: 18,
      total_amount_centavos: 10_000,
      installment_count: 1,
    })

    expect(saved).toEqual({ ok: true, purchase, overLimit: false })
    expect(service.createPurchase).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ category_id: 18, installment_count: 1 }),
      'generated-key',
    )
    expect(saved.purchase.installments[0].statement).toMatchObject({
      id: 9,
      closing_date: '2026-10-10',
    })

    service.createPurchase.mockRejectedValueOnce({
      code: 'validation_failed',
      errors: { category_id: ['Choose an owned expense category.'] },
    })
    const rejected = await store.submitPurchase(7, {
      category_id: 99,
      total_amount_centavos: 10_000,
    })

    expect(rejected).toEqual({ ok: false, purchase: null, overLimit: false })
    expect(store.mutationError).toMatchObject({
      errors: { category_id: ['Choose an owned expense category.'] },
    })
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
    service.createPayment.mockResolvedValue({
      payment: { id: 11 },
      statement: { id: 9, status: 'paid' },
      card: activeCard,
    })
    service.removePayment.mockResolvedValue({
      payment: { id: 11, is_removed: true },
      statement: { id: 9, status: 'overdue' },
      card: activeCard,
    })

    await store.submitPayment(9, { amount_centavos: 1_000 })
    expect(store.statement).toMatchObject({ id: 9, status: 'paid' })

    await store.removeStatementPayment(11)
    expect(store.statement).toMatchObject({ id: 9, status: 'overdue' })
    expect(store.card).toEqual(activeCard)
  })

  it('preserves payment history while edit, removal, restoration, and account reassignment restate the statement', async () => {
    const store = useCreditCardStore()
    const edited = {
      id: 9,
      outstanding_amount: { amount_centavos: 5_000 },
      payments: [{ id: 11, is_removed: false, financial_account: { id: 8, name: 'Savings' } }],
    }
    const removed = {
      id: 9,
      outstanding_amount: { amount_centavos: 10_000 },
      payments: [{ id: 11, is_removed: true, financial_account: { id: 8, name: 'Savings' } }],
    }
    const restored = {
      id: 9,
      outstanding_amount: { amount_centavos: 5_000 },
      payments: [{ id: 11, is_removed: false, financial_account: { id: 7, name: 'Main account' } }],
    }
    service.updatePayment.mockResolvedValue({ statement: edited, card: activeCard })
    service.removePayment.mockResolvedValue({ statement: removed, card: activeCard })
    service.restorePayment.mockResolvedValue({ statement: restored, card: activeCard })

    await store.editPayment(11, { financial_account_id: 8, amount_centavos: 5_000 })
    expect(store.statement).toEqual(edited)
    expect(service.updatePayment).toHaveBeenCalledWith(
      11,
      { financial_account_id: 8, amount_centavos: 5_000 },
      'generated-key',
    )

    await store.removeStatementPayment(11)
    expect(store.statement).toEqual(removed)
    expect(store.statement.payments).toHaveLength(1)
    expect(store.statement.payments[0].is_removed).toBe(true)

    await store.restoreStatementPayment(11, { financial_account_id: 7 })
    expect(store.statement).toEqual(restored)
    expect(store.statement.payments).toHaveLength(1)
    expect(store.statement.payments[0]).toMatchObject({
      is_removed: false,
      financial_account: { id: 7 },
    })
    expect(service.restorePayment).toHaveBeenCalledWith(
      11,
      { financial_account_id: 7 },
      'generated-key',
    )
  })

  it('reloads statement payment history after a partial payment', async () => {
    const store = useCreditCardStore()
    const initial = { id: 9, status: 'closed', payments: [] }
    const settled = {
      id: 9,
      status: 'partially_paid',
      outstanding_amount: { amount_centavos: 6_666 },
      payments: [
        { id: 11, amount: { amount_centavos: 3_334 }, status: 'effective', is_removed: false },
      ],
    }
    service.getStatement.mockResolvedValueOnce(initial).mockResolvedValueOnce(settled)
    service.createPayment.mockResolvedValue({
      payment: settled.payments[0],
      statement: settled,
      card: activeCard,
    })

    await store.fetchStatement(9)
    await store.submitPayment(9, {
      financial_account_id: 7,
      amount_centavos: 3_334,
      payment_date: '2026-10-05',
    })
    await store.fetchStatement(9)

    expect(service.getStatement).toHaveBeenNthCalledWith(1, 9)
    expect(service.getStatement).toHaveBeenNthCalledWith(2, 9)
    expect(store.statement).toEqual(settled)
    expect(store.statement.payments).toHaveLength(1)
  })

  it('loads the additive dashboard projection', async () => {
    const store = useCreditCardStore()
    const projection = {
      outstanding_obligation: { amount_centavos: 30_000 },
      available_credit: { amount_centavos: 470_000 },
      upcoming_statements: [{ id: 9 }],
    }
    service.getDashboardCards.mockResolvedValue(projection)

    await store.fetchDashboard()

    expect(store.dashboard).toEqual(projection)
    expect(store.upcomingStatements).toEqual([{ id: 9 }])
  })

  it('refreshes card state after a direct correction and a credit event', async () => {
    const store = useCreditCardStore()
    const corrected = { id: 301, card: { id: 7 }, is_directly_editable: true }
    const correctedCard = {
      ...activeCard,
      summary: { ...activeCard.summary, used_credit: { amount_centavos: 8_000 } },
    }
    const creditedCard = {
      ...correctedCard,
      summary: { ...correctedCard.summary, card_credit: { amount_centavos: 2_000 } },
    }
    service.updatePurchase.mockResolvedValue(corrected)
    service.getCard.mockResolvedValue(correctedCard)
    service.createCreditEvent.mockResolvedValue({
      credit_event: { id: 91, reason: 'cancellation' },
      card: creditedCard,
      applications: [{ id: 3 }],
    })

    const correction = await store.submitPurchaseCorrection(301, { total_amount_centavos: 8_000 })
    const event = await store.submitCreditEvent(301, {
      reason: 'cancellation',
      amount_centavos: 8_000,
      event_date: '2026-10-05',
    })

    expect(correction.ok).toBe(true)
    expect(event.ok).toBe(true)
    expect(event.result.applications).toEqual([{ id: 3 }])
    expect(service.updatePurchase).toHaveBeenCalledWith(
      301,
      { total_amount_centavos: 8_000 },
      'generated-key',
    )
    expect(service.createCreditEvent).toHaveBeenCalledWith(
      301,
      { reason: 'cancellation', amount_centavos: 8_000, event_date: '2026-10-05' },
      'generated-key',
    )
    expect(store.card).toEqual(creditedCard)
  })

  it('retains the typed archive conflict for an outstanding card', async () => {
    const store = useCreditCardStore()
    service.archiveCard.mockRejectedValue({ code: 'card_has_outstanding_obligation', status: 409 })

    const outcome = await store.archiveCard(7)

    expect(outcome).toEqual({ ok: false, result: null })
    expect(store.mutationError).toMatchObject({
      code: 'card_has_outstanding_obligation',
      status: 409,
    })
  })
})
