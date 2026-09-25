import { apiRequest } from './httpClient'

function newIdempotencyKey() {
  return crypto.randomUUID()
}

/**
 * Every recurrence mutation carries one key per logical action. Callers reuse a
 * supplied key only for an exact retry, so a repeated request replays instead of
 * recording a second change.
 */
function mutation(method, url, payload, idempotencyKey = newIdempotencyKey()) {
  return apiRequest(
    { method, url, data: payload, headers: { 'Idempotency-Key': idempotencyKey } },
    { csrf: true },
  ).then((response) => ({
    rule: response.data.data,
    meta: response.data.meta ?? {},
  }))
}

export async function listRecurringTransactions(params = {}) {
  const response = await apiRequest({ method: 'get', url: '/api/v1/recurring-transactions', params })

  return { items: response.data.data, meta: response.data.meta, links: response.data.links }
}

export async function getRecurringTransaction(id) {
  const response = await apiRequest({ method: 'get', url: `/api/v1/recurring-transactions/${id}` })

  return response.data.data
}

export async function listRecurringTransactionOccurrences(id, params = {}) {
  const response = await apiRequest({
    method: 'get',
    url: `/api/v1/recurring-transactions/${id}/occurrences`,
    params,
  })

  return { items: response.data.data, meta: response.data.meta }
}

export const confirmCardOccurrence = (ruleId, occurrenceId, payload, idempotencyKey = newIdempotencyKey()) =>
  apiRequest(
    {
      method: 'post',
      url: `/api/v1/recurring-transactions/${ruleId}/occurrences/${occurrenceId}/confirm`,
      data: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    },
    { csrf: true },
  ).then((response) => ({ occurrence: response.data.data }))

export const dismissCardOccurrence = (ruleId, occurrenceId, idempotencyKey = newIdempotencyKey()) =>
  apiRequest(
    {
      method: 'post',
      url: `/api/v1/recurring-transactions/${ruleId}/occurrences/${occurrenceId}/dismiss`,
      data: undefined,
      headers: { 'Idempotency-Key': idempotencyKey },
    },
    { csrf: true },
  ).then((response) => ({ occurrence: response.data.data }))

export const retryCardOccurrence = (ruleId, occurrenceId, idempotencyKey = newIdempotencyKey()) =>
  apiRequest(
    {
      method: 'post',
      url: `/api/v1/recurring-transactions/${ruleId}/occurrences/${occurrenceId}/retry`,
      data: undefined,
      headers: { 'Idempotency-Key': idempotencyKey },
    },
    { csrf: true },
  ).then((response) => ({ occurrence: response.data.data }))

export const createRecurringTransaction = (payload, idempotencyKey) =>
  mutation('post', '/api/v1/recurring-transactions', payload, idempotencyKey)

export const updateRecurringTransaction = (id, payload, idempotencyKey) =>
  mutation('patch', `/api/v1/recurring-transactions/${id}`, payload, idempotencyKey)

export const pauseRecurringTransaction = (id, idempotencyKey) =>
  mutation('post', `/api/v1/recurring-transactions/${id}/pause`, undefined, idempotencyKey)

export const resumeRecurringTransaction = (id, idempotencyKey) =>
  mutation('post', `/api/v1/recurring-transactions/${id}/resume`, undefined, idempotencyKey)

export const endRecurringTransaction = (id, idempotencyKey) =>
  mutation('post', `/api/v1/recurring-transactions/${id}/end`, undefined, idempotencyKey)
