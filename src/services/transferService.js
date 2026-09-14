import { apiRequest } from './httpClient'

function newIdempotencyKey() {
  return crypto.randomUUID()
}

/**
 * Every mutation carries one key per logical action. Callers reuse the supplied
 * key only for an exact retry, so a repeated request replays instead of
 * recording a second transfer.
 */
function mutation(method, url, payload, idempotencyKey = newIdempotencyKey()) {
  return apiRequest(
    { method, url, data: payload, headers: { 'Idempotency-Key': idempotencyKey } },
    { csrf: true },
  ).then((response) => ({
    transfer: response.data.data,
    meta: response.data.meta ?? {},
  }))
}

export async function listTransfers(params = {}) {
  const response = await apiRequest({ method: 'get', url: '/api/v1/transfers', params })

  return { items: response.data.data, meta: response.data.meta, links: response.data.links }
}

export async function getTransfer(id) {
  const response = await apiRequest({ method: 'get', url: `/api/v1/transfers/${id}` })

  return response.data.data
}

export const createTransfer = (payload, idempotencyKey) =>
  mutation('post', '/api/v1/transfers', payload, idempotencyKey)

export const updateTransfer = (id, payload, idempotencyKey) =>
  mutation('patch', `/api/v1/transfers/${id}`, payload, idempotencyKey)

export const removeTransfer = (id, idempotencyKey) =>
  mutation('post', `/api/v1/transfers/${id}/remove`, undefined, idempotencyKey)

export const restoreTransfer = (id, payload = {}, idempotencyKey) =>
  mutation('post', `/api/v1/transfers/${id}/restore`, payload, idempotencyKey)
