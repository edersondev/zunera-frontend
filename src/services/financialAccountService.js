import { apiRequest } from './httpClient'

function data(response) {
  return response.data.data
}

export async function listFinancialAccounts(status = 'active') {
  return data(
    await apiRequest({
      method: 'get',
      url: '/api/v1/financial-accounts',
      params: { status },
    }),
  )
}

export async function getFinancialAccountSummary() {
  return data(
    await apiRequest({
      method: 'get',
      url: '/api/v1/financial-accounts/summary',
    }),
  )
}

export async function getFinancialAccount(id) {
  return data(
    await apiRequest({
      method: 'get',
      url: `/api/v1/financial-accounts/${id}`,
    }),
  )
}

export async function createFinancialAccount(payload) {
  return data(
    await apiRequest(
      {
        method: 'post',
        url: '/api/v1/financial-accounts',
        data: payload,
      },
      { csrf: true },
    ),
  )
}

export async function updateFinancialAccount(id, payload) {
  return data(
    await apiRequest(
      {
        method: 'patch',
        url: `/api/v1/financial-accounts/${id}`,
        data: payload,
      },
      { csrf: true },
    ),
  )
}

export async function archiveFinancialAccount(id) {
  return data(
    await apiRequest(
      {
        method: 'post',
        url: `/api/v1/financial-accounts/${id}/archive`,
      },
      { csrf: true },
    ),
  )
}

export async function restoreFinancialAccount(id) {
  return data(
    await apiRequest(
      {
        method: 'post',
        url: `/api/v1/financial-accounts/${id}/restore`,
      },
      { csrf: true },
    ),
  )
}
