import { apiRequest } from './httpClient'

const BASE_URL = '/api/v1/financial-reports'
const SCOPE_KEYS = ['preset', 'month', 'from', 'to', 'account_id', 'category_id', 'transaction_type']

export function reportScopeParams(scope = {}) {
  return Object.fromEntries(SCOPE_KEYS.filter((key) => scope[key] !== null && scope[key] !== undefined && scope[key] !== '').map((key) => [key, scope[key]]))
}

export async function getFinancialReport(scope = {}, { signal } = {}) {
  const response = await apiRequest({ method: 'get', url: BASE_URL, params: reportScopeParams(scope), signal })
  return response.data.data
}

export async function getFinancialReportContributions(scope = {}, detail = {}, { signal } = {}) {
  const params = {
    ...reportScopeParams(scope),
    metric: detail.metric,
    which_period: detail.which_period ?? 'current',
    limit: detail.limit ?? 50,
  }
  if (detail.metric_id !== null && detail.metric_id !== undefined) params.metric_id = detail.metric_id
  if (detail.cursor) params.cursor = detail.cursor
  const response = await apiRequest({ method: 'get', url: `${BASE_URL}/contributions`, params, signal })
  return response.data.data
}
