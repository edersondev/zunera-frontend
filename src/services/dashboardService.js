import { apiRequest } from './httpClient'

const BASE_URL = '/api/v1/financial-dashboard'

function data(response) {
  return response.data.data
}

function periodParams(period) {
  if (!period?.preset) return {}

  const params = { preset: period.preset }

  if (period.preset === 'custom' && period.from && period.to) {
    params.from = period.from
    params.to = period.to
  }

  return params
}

export async function getDashboardSummary(period) {
  return data(
    await apiRequest({
      method: 'get',
      url: `${BASE_URL}/summary`,
      params: periodParams(period),
    }),
  )
}

export async function getDashboardAccounts() {
  return data(
    await apiRequest({
      method: 'get',
      url: `${BASE_URL}/accounts`,
    }),
  )
}

export async function getDashboardExpenseDistribution(period) {
  return data(
    await apiRequest({
      method: 'get',
      url: `${BASE_URL}/expense-distribution`,
      params: periodParams(period),
    }),
  )
}

export async function getDashboardEvolution(period) {
  return data(
    await apiRequest({
      method: 'get',
      url: `${BASE_URL}/evolution`,
      params: periodParams(period),
    }),
  )
}

export async function getDashboardRecentActivity() {
  return data(
    await apiRequest({
      method: 'get',
      url: `${BASE_URL}/recent-activity`,
    }),
  )
}

export async function getDashboardUpcomingActivity() {
  const response = await apiRequest({
    method: 'get',
    url: `${BASE_URL}/upcoming-activity`,
  })

  return { items: response.data.data, meta: response.data.meta }
}
