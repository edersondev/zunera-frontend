import { apiRequest } from './httpClient'

export const newIdempotencyKey = () => crypto.randomUUID()

function mutation(method, url, payload, key = newIdempotencyKey()) {
  return apiRequest(
    { method, url, data: payload, headers: { 'Idempotency-Key': key } },
    { csrf: true },
  ).then((response) => response.data.data)
}

function collection(response) {
  return { items: response.data.data, meta: response.data.meta, links: response.data.links }
}

export async function listGoals(params = {}) {
  return collection(await apiRequest({ method: 'get', url: '/api/v1/financial-goals', params }))
}

export async function getGoal(id) {
  return (await apiRequest({ method: 'get', url: `/api/v1/financial-goals/${id}` })).data.data
}

export async function getGoalSummary() {
  return (await apiRequest({ method: 'get', url: '/api/v1/financial-goals/summary' })).data.data
}

export async function getDashboardGoals() {
  return (await apiRequest({ method: 'get', url: '/api/v1/financial-dashboard/goals' })).data.data
}

export async function listGoalActivities(id, params = {}) {
  return collection(await apiRequest({ method: 'get', url: `/api/v1/financial-goals/${id}/activities`, params }))
}

export const createGoal = (payload, key) => mutation('post', '/api/v1/financial-goals', payload, key)
export const updateGoal = (id, payload, key) => mutation('patch', `/api/v1/financial-goals/${id}`, payload, key)
export const allocateGoal = (id, amount, key) => mutation('post', `/api/v1/financial-goals/${id}/allocations`, { amount_centavos: amount }, key)
export const withdrawGoal = (id, amount, key) => mutation('post', `/api/v1/financial-goals/${id}/withdrawals`, { amount_centavos: amount }, key)
export function transitionGoal(id, action, key) {
  if (!['complete', 'reopen', 'archive', 'restore'].includes(action)) throw new Error('Unsupported goal action')
  return mutation('post', `/api/v1/financial-goals/${id}/${action}`, undefined, key)
}
