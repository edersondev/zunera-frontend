import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/creditCardService', () => ({
  listCards: vi.fn(),
  getCard: vi.fn(),
  getPurchase: vi.fn(),
  getStatementOptions: vi.fn(),
  previewPurchaseMove: vi.fn(),
  movePurchase: vi.fn(),
  listPurchaseMoves: vi.fn(),
  deletePurchase: vi.fn(),
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
  service.listPurchases.mockResolvedValue({ purchases: [], meta: null })
  service.listStatements.mockResolvedValue({ statements: [], meta: null })
  service.getDashboardCards.mockResolvedValue({ upcoming_statements: [] })
})

describe('creditCardStore', () => {
  it('loads date-specific options and discards a stale response after the date changes', async () => {
    const store = useCreditCardStore()
    let finishFirst
    service.getStatementOptions.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve }))
    service.getStatementOptions.mockResolvedValueOnce({ requires_statement_choice: true, options: [{ closing_date: '2026-12-10' }] })
    const first = store.fetchStatementOptions(7, { purchase_date: '2026-09-01' })
    await store.fetchStatementOptions(7, { purchase_date: '2026-10-01' })
    finishFirst({ requires_statement_choice: false, options: [] })
    await first

    expect(store.statementOptions.options[0].closing_date).toBe('2026-12-10')
    expect(service.getStatementOptions).toHaveBeenNthCalledWith(2, 7, { purchase_date: '2026-10-01' })
    store.clearStatementOptions()
    expect(store.statementOptions).toBeNull()
  })

  it('passes an explicit statement choice through creation and surfaces a rejected choice', async () => {
    const store = useCreditCardStore()
    const payload = { purchase_date: '2026-09-09', statement_closing_date: '2026-11-10', total_amount_centavos: 1_000 }
    await store.submitPurchase(7, payload)
    expect(service.createPurchase).toHaveBeenCalledWith(7, payload, 'generated-key')
    service.createPurchase.mockRejectedValueOnce({ status: 422, errors: { statement_closing_date: ['Statement choice changed.'] } })
    const outcome = await store.submitPurchase(7, payload)
    expect(outcome.ok).toBe(false)
    expect(store.mutationError.errors.statement_closing_date).toEqual(['Statement choice changed.'])
  })

  it('keeps stale preview errors and refreshes affected views after a successful move', async () => {
    const store = useCreditCardStore()
    service.previewPurchaseMove.mockRejectedValueOnce({ code: 'STALE_MOVE_PREVIEW', message: 'Changed' })
    expect(await store.previewMove(3, { mode: 'full_schedule' })).toBeNull()
    expect(store.previewError.code).toBe('STALE_MOVE_PREVIEW')
    service.previewPurchaseMove.mockResolvedValueOnce({ preview_token: 'fresh' })
    expect(await store.previewMove(3, { mode: 'full_schedule' })).toEqual({ preview_token: 'fresh' })
    service.movePurchase.mockResolvedValue({ purchase: { id: 3 } })
    service.getStatement.mockResolvedValue({ id: 72 })

    const outcome = await store.submitMove(3, { preview_token: 'fresh' }, 7, 72, 'move-key')
    expect(outcome.ok).toBe(true)
    expect(service.movePurchase).toHaveBeenCalledWith(3, { preview_token: 'fresh' }, 'move-key')
    expect(service.getCard).toHaveBeenCalledWith(7)
    expect(service.listPurchases).toHaveBeenCalledWith(7, {})
    expect(service.listStatements).toHaveBeenCalledWith(7)
    expect(service.getStatement).toHaveBeenCalledWith(72)
    expect(service.getDashboardCards).toHaveBeenCalled()
    expect(store.movePreview).toBeNull()
  })

  it('ignores an older move preview after the target changes or preview is cleared', async () => {
    const store = useCreditCardStore()
    let finishFirst
    let finishSecond
    service.previewPurchaseMove
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve }))

    const first = store.previewMove(3, { target_closing_date: '2026-11-10' })
    const second = store.previewMove(3, { target_closing_date: '2026-12-10' })
    finishSecond({ preview_token: 'december' })
    expect(await second).toEqual({ preview_token: 'december' })
    finishFirst({ preview_token: 'november' })
    expect(await first).toBeNull()
    expect(store.movePreview.preview_token).toBe('december')

    let finishCleared
    service.previewPurchaseMove.mockImplementationOnce(() => new Promise((resolve) => { finishCleared = resolve }))
    const pending = store.previewMove(3, { target_closing_date: '2027-01-10' })
    store.clearMovePreview()
    finishCleared({ preview_token: 'january' })
    expect(await pending).toBeNull()
    expect(store.movePreview).toBeNull()
    expect(store.previewLoading).toBe(false)
  })

  it('keeps linked-credit delete conflict and refreshes after a successful delete', async () => {
    const store = useCreditCardStore()
    service.deletePurchase.mockRejectedValueOnce({ code: 'PURCHASE_HAS_LINKED_CREDITS' })
    const rejected = await store.submitDeletePurchase(3, 7, 72, 'delete-key')
    expect(rejected.ok).toBe(false)
    expect(store.mutationError.code).toBe('PURCHASE_HAS_LINKED_CREDITS')
    service.deletePurchase.mockResolvedValueOnce({ deleted_purchase_id: 3 })
    service.getStatement.mockResolvedValue({ id: 72, payments: [{ id: 9 }] })
    const success = await store.submitDeletePurchase(3, 7, 72, 'delete-key')
    expect(success.ok).toBe(true)
    expect(service.deletePurchase).toHaveBeenLastCalledWith(3, 'delete-key')
    expect(store.statement.payments).toEqual([{ id: 9 }])
    expect(service.listPurchases).toHaveBeenCalledWith(7, {})
  })
  it('appends purchase pages once and stops at the last page', async () => {
    const store = useCreditCardStore()
    service.listPurchases
      .mockResolvedValueOnce({ purchases: [{ id: 3 }, { id: 2 }], meta: { current_page: 1, last_page: 2 } })
      .mockResolvedValueOnce({ purchases: [{ id: 2 }, { id: 1 }], meta: { current_page: 2, last_page: 2 } })

    await store.fetchPurchases(7)
    await store.loadMorePurchases(7)
    await store.loadMorePurchases(7)

    expect(store.purchases.map((purchase) => purchase.id)).toEqual([3, 2, 1])
    expect(store.hasMorePurchases).toBe(false)
    expect(service.listPurchases).toHaveBeenCalledTimes(2)
    expect(service.listPurchases).toHaveBeenLastCalledWith(7, { page: 2 })
  })

  it('keeps failed page available for explicit retry without automatic repeats', async () => {
    const store = useCreditCardStore()
    service.listPurchases
      .mockResolvedValueOnce({ purchases: [{ id: 3 }], meta: { current_page: 1, last_page: 2 } })
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ purchases: [{ id: 2 }], meta: { current_page: 2, last_page: 2 } })

    await store.fetchPurchases(7)
    await store.loadMorePurchases(7)
    await store.loadMorePurchases(7)
    expect(service.listPurchases).toHaveBeenCalledTimes(2)
    expect(store.purchaseLoadError.message).toBe('Network error')

    await store.retryPurchases(7)
    expect(store.purchases.map((purchase) => purchase.id)).toEqual([3, 2])
    expect(store.purchaseLoadError).toBeNull()
  })

  it('ignores a pending page after reset and blocks simultaneous page requests', async () => {
    const store = useCreditCardStore()
    let finishPage
    service.listPurchases
      .mockResolvedValueOnce({ purchases: [{ id: 3 }], meta: { current_page: 1, last_page: 2 } })
      .mockImplementationOnce(() => new Promise((resolve) => { finishPage = resolve }))
      .mockResolvedValueOnce({ purchases: [{ id: 9 }], meta: { current_page: 1, last_page: 1 } })

    await store.fetchPurchases(7)
    const pending = store.loadMorePurchases(7)
    await store.loadMorePurchases(7)
    expect(service.listPurchases).toHaveBeenCalledTimes(2)

    await store.fetchPurchases(8)
    finishPage({ purchases: [{ id: 2 }], meta: { current_page: 2, last_page: 2 } })
    await pending
    expect(store.purchases.map((purchase) => purchase.id)).toEqual([9])
    expect(store.purchaseLoadingMore).toBe(false)
    expect(store.purchaseListVersion).toBe(2)
  })

  it('does not replace a new card when an old card mutation finishes after navigation', async () => {
    const store = useCreditCardStore()
    let finishMove
    service.getCard.mockImplementation(async (id) => ({ ...activeCard, id }))
    service.listPurchases.mockImplementation(async (id) => ({
      purchases: [{ id: id * 10 }],
      meta: { current_page: 1, last_page: 1 },
    }))
    service.movePurchase.mockImplementationOnce(() => new Promise((resolve) => { finishMove = resolve }))

    await store.fetchCard(7)
    await store.fetchPurchases(7)
    const moving = store.submitMove(70, { preview_token: 'move' }, 7)
    await store.fetchCard(8)
    await store.fetchPurchases(8)
    finishMove({ purchase: { id: 70 } })
    await moving

    expect(store.card.id).toBe(8)
    expect(store.purchases.map((purchase) => purchase.id)).toEqual([80])
    expect(service.listPurchases).toHaveBeenCalledTimes(2)
  })

  it('ignores an old card refresh that resolves after navigation', async () => {
    const store = useCreditCardStore()
    let finishOldCardRefresh
    service.getCard
      .mockResolvedValueOnce({ ...activeCard, id: 7 })
      .mockImplementationOnce(() => new Promise((resolve) => { finishOldCardRefresh = resolve }))
      .mockResolvedValueOnce({ ...activeCard, id: 8 })
    service.movePurchase.mockResolvedValueOnce({ purchase: { id: 70 } })

    await store.fetchCard(7)
    const moving = store.submitMove(70, { preview_token: 'move' }, 7)
    await vi.waitFor(() => expect(finishOldCardRefresh).toBeTypeOf('function'))
    await store.fetchCard(8)
    finishOldCardRefresh({ ...activeCard, id: 7 })
    await moving

    expect(store.card.id).toBe(8)
  })
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

  it('loads an owned purchase for statement actions and surfaces lookup errors', async () => {
    const store = useCreditCardStore()
    const purchase = { id: 21, description: 'Groceries' }
    service.getPurchase.mockResolvedValueOnce(purchase).mockRejectedValueOnce(new Error('Unavailable'))

    expect(await store.fetchPurchase(21)).toEqual(purchase)
    expect(service.getPurchase).toHaveBeenCalledWith(21)
    expect(await store.fetchPurchase(21)).toBeNull()
    expect(store.error.message).toBe('Unavailable')
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

    store.dismissMutationError()

    expect(store.mutationError).toBeNull()
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
