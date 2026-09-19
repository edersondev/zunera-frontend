import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({
  apiRequest: vi.fn(),
}))

const { apiRequest } = await import('../httpClient')
const {
  copyBudgetMonth,
  createBudgetMonth,
  createBudgetPlan,
  getBudgetMonth,
  removeBudgetPlan,
  updateBudgetPlan,
} = await import('../budgetService')

const BASE_URL = '/api/v1/budgets'

describe('budgetService', () => {
  beforeEach(() => {
    apiRequest.mockReset()
    apiRequest.mockResolvedValue({ data: { data: { period: { year: 2026, month: 9 } } } })
  })

  it('reads one owner month and unwraps the payload', async () => {
    const payload = await getBudgetMonth(2026, 9)

    expect(apiRequest).toHaveBeenCalledWith({ method: 'get', url: `${BASE_URL}/2026/9` })
    expect(payload.period).toEqual({ year: 2026, month: 9 })
  })

  it('creates months and plans with CSRF protection', async () => {
    await createBudgetMonth(2026, 9)
    await createBudgetPlan(7, { category_id: 3, planned_amount_centavos: 100_000 })
    await updateBudgetPlan(7, 11, { planned_amount_centavos: 120_000 })
    await removeBudgetPlan(7, 11)
    await copyBudgetMonth(7, { destination_year: 2026, destination_month: 10 })

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      { method: 'post', url: BASE_URL, data: { year: 2026, month: 9 } },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      {
        method: 'post',
        url: `${BASE_URL}/7/plans`,
        data: { category_id: 3, planned_amount_centavos: 100_000 },
      },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      3,
      {
        method: 'patch',
        url: `${BASE_URL}/7/plans/11`,
        data: { planned_amount_centavos: 120_000 },
      },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      4,
      { method: 'delete', url: `${BASE_URL}/7/plans/11` },
      { csrf: true },
    )
    expect(apiRequest).toHaveBeenNthCalledWith(
      5,
      {
        method: 'post',
        url: `${BASE_URL}/7/copy`,
        data: { destination_year: 2026, destination_month: 10 },
      },
      { csrf: true },
    )
  })
})
