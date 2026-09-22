import { apiRequest } from './httpClient'

const CARDS = '/api/v1/credit-cards'
const PURCHASES = '/api/v1/credit-card-purchases'
const STATEMENTS = '/api/v1/credit-card-statements'
const PAYMENTS = '/api/v1/credit-card-payments'
const DASHBOARD = '/api/v1/financial-dashboard/credit-cards'
const MUTATION = { csrf: true }

export function newIdempotencyKey() {
  return crypto.randomUUID()
}

/**
 * Every financial mutation carries an Idempotency-Key. Callers may pass the key
 * they already used so a network retry of the identical mutation replays
 * instead of duplicating money, while an explicit over-limit confirmation is
 * submitted as a new mutation with a fresh key.
 */
function mutation(method, url, payload, idempotencyKey = newIdempotencyKey()) {
  return apiRequest(
    { method, url, data: payload, headers: { 'Idempotency-Key': idempotencyKey } },
    MUTATION,
  ).then((response) => response.data.data)
}

export async function listCards(view = 'active') {
  const response = await apiRequest({ method: 'get', url: CARDS, params: { view } })

  return response.data.data
}

export const createCard = (payload, idempotencyKey) => mutation('post', CARDS, payload, idempotencyKey)

export async function getCard(cardId) {
  const response = await apiRequest({ method: 'get', url: `${CARDS}/${cardId}` })

  return response.data.data
}

export const updateCard = (cardId, payload, idempotencyKey) =>
  mutation('patch', `${CARDS}/${cardId}`, payload, idempotencyKey)

export const archiveCard = (cardId, idempotencyKey) =>
  mutation('post', `${CARDS}/${cardId}/archive`, undefined, idempotencyKey)

export const restoreCard = (cardId, idempotencyKey) =>
  mutation('post', `${CARDS}/${cardId}/restore`, undefined, idempotencyKey)

export async function listPurchases(cardId, params = {}) {
  const response = await apiRequest({ method: 'get', url: `${CARDS}/${cardId}/purchases`, params })

  return { purchases: response.data.data, meta: response.data.meta }
}

export const createPurchase = (cardId, payload, idempotencyKey) =>
  mutation('post', `${CARDS}/${cardId}/purchases`, payload, idempotencyKey)

export async function getPurchase(purchaseId) {
  const response = await apiRequest({ method: 'get', url: `${PURCHASES}/${purchaseId}` })

  return response.data.data
}

export const updatePurchase = (purchaseId, payload, idempotencyKey) =>
  mutation('patch', `${PURCHASES}/${purchaseId}`, payload, idempotencyKey)

export const createCreditEvent = (purchaseId, payload, idempotencyKey) =>
  mutation('post', `${PURCHASES}/${purchaseId}/credit-events`, payload, idempotencyKey)

export async function listStatements(cardId, params = {}) {
  const response = await apiRequest({ method: 'get', url: `${CARDS}/${cardId}/statements`, params })

  return { statements: response.data.data, meta: response.data.meta }
}

export async function getStatement(statementId) {
  const response = await apiRequest({ method: 'get', url: `${STATEMENTS}/${statementId}` })

  return response.data.data
}

export const createPayment = (statementId, payload, idempotencyKey) =>
  mutation('post', `${STATEMENTS}/${statementId}/payments`, payload, idempotencyKey)

export const updatePayment = (paymentId, payload, idempotencyKey) =>
  mutation('patch', `${PAYMENTS}/${paymentId}`, payload, idempotencyKey)

export const removePayment = (paymentId, idempotencyKey) =>
  mutation('post', `${PAYMENTS}/${paymentId}/remove`, undefined, idempotencyKey)

export const restorePayment = (paymentId, payload = {}, idempotencyKey) =>
  mutation('post', `${PAYMENTS}/${paymentId}/restore`, payload, idempotencyKey)

export async function getDashboardCards() {
  const response = await apiRequest({ method: 'get', url: DASHBOARD })

  return response.data.data
}

/**
 * A confirmation-required outcome is a typed 409, not a failed save: it carries
 * the exact resulting available credit so the dialog can ask the user to
 * confirm before submitting a brand-new mutation with a fresh key.
 */
export function isOverLimitConfirmation(error) {
  return error?.code === 'OVER_LIMIT_CONFIRMATION_REQUIRED'
}

export function overLimitResultingCentavos(error) {
  return error?.payload?.resulting_available_credit?.amount_centavos ?? 0
}
