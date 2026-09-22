import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  apiRequest: vi.fn(),
}))

const { apiRequest } = await import('../httpClient')
const {
  archiveCard,
  createCard,
  createCreditEvent,
  createPayment,
  createPurchase,
  getCard,
  getDashboardCards,
  getPurchase,
  getStatement,
  isOverLimitConfirmation,
  listCards,
  listPurchases,
  listStatements,
  newIdempotencyKey,
  overLimitResultingCentavos,
  removePayment,
  restoreCard,
  restorePayment,
  updateCard,
  updatePayment,
  updatePurchase,
} = await import('../creditCardService')

const CARDS = '/api/v1/credit-cards'
const MUTATION = { csrf: true }

function resolved(data) {
  return { data: { data } }
}

beforeEach(() => {
  apiRequest.mockReset()
  apiRequest.mockResolvedValue(resolved({ id: 1 }))
})

describe('creditCardService', () => {
  it('lists cards by view and unwraps the payload', async () => {
    apiRequest.mockResolvedValue(resolved([{ id: 1, status: 'active' }]))

    const cards = await listCards('archived')

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      url: CARDS,
      params: { view: 'archived' },
    })
    expect(cards).toEqual([{ id: 1, status: 'active' }])
  })

  it('reads one card and the additive dashboard projection', async () => {
    await getCard(7)
    await getDashboardCards()

    expect(apiRequest).toHaveBeenNthCalledWith(1, { method: 'get', url: `${CARDS}/7` })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: '/api/v1/financial-dashboard/credit-cards',
    })
  })

  it('sends card mutations with CSRF and an idempotency key', async () => {
    await createCard({ name: 'Nubank' }, 'card-key')
    await updateCard(7, { closing_day: 25 }, 'card-update-key')
    await archiveCard(7, 'card-archive-key')
    await restoreCard(7, 'card-restore-key')

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      {
        method: 'post',
        url: CARDS,
        data: { name: 'Nubank' },
        headers: { 'Idempotency-Key': 'card-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      {
        method: 'patch',
        url: `${CARDS}/7`,
        data: { closing_day: 25 },
        headers: { 'Idempotency-Key': 'card-update-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      3,
      {
        method: 'post',
        url: `${CARDS}/7/archive`,
        data: undefined,
        headers: { 'Idempotency-Key': 'card-archive-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      4,
      {
        method: 'post',
        url: `${CARDS}/7/restore`,
        data: undefined,
        headers: { 'Idempotency-Key': 'card-restore-key' },
      },
      MUTATION,
    )
  })

  it('reuses the same key when a mutation is retried and a fresh key for a new mutation', async () => {
    const firstKey = newIdempotencyKey()
    await createCard({ name: 'Nubank' }, firstKey)
    await createCard({ name: 'Nubank' }, firstKey)
    await createCard({ name: 'Nubank' })

    const keys = apiRequest.mock.calls.map((call) => call[0].headers['Idempotency-Key'])
    expect(keys[0]).toBe(firstKey)
    expect(keys[1]).toBe(firstKey)
    expect(keys[2]).not.toBe(firstKey)
    expect(keys[2]).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('reads and creates purchases, statements, payments, and credit events', async () => {
    apiRequest.mockResolvedValueOnce({ data: { data: [{ id: 1 }], meta: { total: 1 } } })
    apiRequest.mockResolvedValueOnce({ data: { data: [{ id: 2 }], meta: { total: 1 } } })

    const purchases = await listPurchases(7, { page: 1 })
    const statements = await listStatements(7, { status: 'open' })

    expect(purchases).toEqual({ purchases: [{ id: 1 }], meta: { total: 1 } })
    expect(statements).toEqual({ statements: [{ id: 2 }], meta: { total: 1 } })
    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'get',
      url: `${CARDS}/7/purchases`,
      params: { page: 1 },
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: `${CARDS}/7/statements`,
      params: { status: 'open' },
    })

    await getPurchase(3)
    await createPurchase(7, { total_amount_centavos: 1_000 }, 'purchase-key')
    await updatePurchase(3, { total_amount_centavos: 2_000 }, 'purchase-update-key')
    await createCreditEvent(
      3,
      { reason: 'refund', amount_centavos: 500, event_date: '2026-09-19' },
      'event-key',
    )
    await getStatement(9)
    await createPayment(
      9,
      { amount_centavos: 500, financial_account_id: 1, payment_date: '2026-09-19' },
      'payment-key',
    )
    await updatePayment(11, { amount_centavos: 600 }, 'payment-update-key')
    await removePayment(11, 'payment-remove-key')
    await restorePayment(11, {}, 'payment-restore-key')

    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'post',
        url: `${CARDS}/7/purchases`,
        data: { total_amount_centavos: 1_000 },
        headers: { 'Idempotency-Key': 'purchase-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'patch',
        url: `/api/v1/credit-card-purchases/3`,
        data: { total_amount_centavos: 2_000 },
        headers: { 'Idempotency-Key': 'purchase-update-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'post',
        url: `/api/v1/credit-card-purchases/3/credit-events`,
        data: { reason: 'refund', amount_centavos: 500, event_date: '2026-09-19' },
        headers: { 'Idempotency-Key': 'event-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'post',
        url: `/api/v1/credit-card-statements/9/payments`,
        data: { amount_centavos: 500, financial_account_id: 1, payment_date: '2026-09-19' },
        headers: { 'Idempotency-Key': 'payment-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'patch',
        url: '/api/v1/credit-card-payments/11',
        data: { amount_centavos: 600 },
        headers: { 'Idempotency-Key': 'payment-update-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'post',
        url: `/api/v1/credit-card-payments/11/remove`,
        data: undefined,
        headers: { 'Idempotency-Key': 'payment-remove-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenCalledWith(
      {
        method: 'post',
        url: `/api/v1/credit-card-payments/11/restore`,
        data: {},
        headers: { 'Idempotency-Key': 'payment-restore-key' },
      },
      MUTATION,
    )
  })

  it('reuses an explicit payment key for an identical partial-payment retry', async () => {
    const payload = {
      financial_account_id: 7,
      amount_centavos: 3_334,
      payment_date: '2026-10-05',
    }

    await createPayment(72, payload, 'partial-payment-retry')
    await createPayment(72, payload, 'partial-payment-retry')

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      {
        method: 'post',
        url: '/api/v1/credit-card-statements/72/payments',
        data: payload,
        headers: { 'Idempotency-Key': 'partial-payment-retry' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      {
        method: 'post',
        url: '/api/v1/credit-card-statements/72/payments',
        data: payload,
        headers: { 'Idempotency-Key': 'partial-payment-retry' },
      },
      MUTATION,
    )
  })

  it('sends cancellation and correction credit events through the same traceable endpoint', async () => {
    const cancellation = {
      reason: 'cancellation',
      amount_centavos: 1_000,
      event_date: '2026-10-05',
    }
    const correction = { reason: 'correction', amount_centavos: 250, event_date: '2026-10-06' }

    await createCreditEvent(301, cancellation, 'cancel-key')
    await createCreditEvent(301, correction, 'correction-key')

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      {
        method: 'post',
        url: '/api/v1/credit-card-purchases/301/credit-events',
        data: cancellation,
        headers: { 'Idempotency-Key': 'cancel-key' },
      },
      MUTATION,
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      {
        method: 'post',
        url: '/api/v1/credit-card-purchases/301/credit-events',
        data: correction,
        headers: { 'Idempotency-Key': 'correction-key' },
      },
      MUTATION,
    )
  })

  it('recognises the typed over-limit confirmation outcome', () => {
    const confirmation = {
      code: 'OVER_LIMIT_CONFIRMATION_REQUIRED',
      payload: {
        resulting_available_credit: { amount_centavos: -50_000, currency_code: 'BRL' },
        is_over_limit: true,
      },
    }

    expect(isOverLimitConfirmation(confirmation)).toBe(true)
    expect(isOverLimitConfirmation({ code: 'idempotency_key_reused' })).toBe(false)
    expect(overLimitResultingCentavos(confirmation)).toBe(-50_000)
    expect(overLimitResultingCentavos({})).toBe(0)
  })
})
