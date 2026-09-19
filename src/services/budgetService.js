import { apiRequest } from './httpClient'

const BASE_URL = '/api/v1/budgets'
const MUTATION = { csrf: true }

function monthData(response) {
  return response.data.data
}

export async function getBudgetMonth(year, month) {
  return monthData(
    await apiRequest({
      method: 'get',
      url: `${BASE_URL}/${year}/${month}`,
    }),
  )
}

export async function createBudgetMonth(year, month) {
  return monthData(
    await apiRequest(
      {
        method: 'post',
        url: BASE_URL,
        data: { year, month },
      },
      MUTATION,
    ),
  )
}

export async function createBudgetPlan(budgetId, payload) {
  return monthData(
    await apiRequest(
      {
        method: 'post',
        url: `${BASE_URL}/${budgetId}/plans`,
        data: payload,
      },
      MUTATION,
    ),
  )
}

export async function updateBudgetPlan(budgetId, planId, payload) {
  return monthData(
    await apiRequest(
      {
        method: 'patch',
        url: `${BASE_URL}/${budgetId}/plans/${planId}`,
        data: payload,
      },
      MUTATION,
    ),
  )
}

export async function removeBudgetPlan(budgetId, planId) {
  return monthData(
    await apiRequest(
      {
        method: 'delete',
        url: `${BASE_URL}/${budgetId}/plans/${planId}`,
      },
      MUTATION,
    ),
  )
}

export async function copyBudgetMonth(budgetId, payload) {
  return monthData(
    await apiRequest(
      {
        method: 'post',
        url: `${BASE_URL}/${budgetId}/copy`,
        data: payload,
      },
      MUTATION,
    ),
  )
}
