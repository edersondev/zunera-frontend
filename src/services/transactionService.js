import { apiRequest } from './httpClient'

function key() {
  return crypto.randomUUID()
}

/**
 * Mutations resolve to the persisted resource plus the response metadata the
 * backend uses for typed notices, so callers can surface them without parsing
 * the transport response directly.
 */
function mutation(method, url, payload, idempotencyKey = key()) {
  return apiRequest(
    { method, url, data: payload, headers: { 'Idempotency-Key': idempotencyKey } },
    { csrf: true },
  ).then((response) => ({
    transaction: response.data.data,
    meta: response.data.meta ?? {},
  }))
}

export async function listTransactions(params = {}) {
  const response = await apiRequest({ method: 'get', url: '/api/v1/transactions', params })

  return { items: response.data.data, meta: response.data.meta, links: response.data.links }
}

/**
 * Canonical mixed read projection used by the history screen. Each entry carries
 * movement_kind (income, expense, or transfer); transfers include both account
 * sides and never a category or income/expense sign.
 */
export async function listFinancialHistory(params = {}) {
  const response = await apiRequest({ method: 'get', url: '/api/v1/financial-history', params })

  return { items: response.data.data, meta: response.data.meta, links: response.data.links }
}

export async function getTransaction(id) {
  const response = await apiRequest({ method: 'get', url: `/api/v1/transactions/${id}` })

  return response.data.data
}

export const createTransaction = (payload, idempotencyKey) =>
  mutation('post', '/api/v1/transactions', payload, idempotencyKey)

export const updateTransaction = (id, payload, idempotencyKey) =>
  mutation('patch', `/api/v1/transactions/${id}`, payload, idempotencyKey)

export const removeTransaction = (id, idempotencyKey) =>
  mutation('post', `/api/v1/transactions/${id}/remove`, undefined, idempotencyKey)

export const restoreTransaction = (id, payload = {}, idempotencyKey) =>
  mutation('post', `/api/v1/transactions/${id}/restore`, payload, idempotencyKey)
