import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../httpClient', () => ({ apiRequest: vi.fn() }))
const { apiRequest } = await import('../httpClient')
const goals = await import('../financialGoalService')

beforeEach(() => {
  apiRequest.mockReset()
})

describe('financialGoalService', () => {
  it('reads list, detail, summary, dashboard, and paged activity envelopes', async () => {
    apiRequest.mockResolvedValue({ data: { data: [{ id: 7 }], meta: { total: 1 }, links: {} } })
    await expect(goals.listGoals({ status: 'completed' })).resolves.toMatchObject({ items: [{ id: 7 }] })
    expect(apiRequest).toHaveBeenLastCalledWith({ method: 'get', url: '/api/v1/financial-goals', params: { status: 'completed' } })
    await expect(goals.getGoal(7)).resolves.toEqual([{ id: 7 }])
    await expect(goals.getGoalSummary()).resolves.toEqual([{ id: 7 }])
    await expect(goals.getDashboardGoals()).resolves.toEqual([{ id: 7 }])
    await expect(goals.listGoalActivities(7, { page: 2 })).resolves.toMatchObject({ items: [{ id: 7 }] })
    expect(apiRequest).toHaveBeenLastCalledWith({ method: 'get', url: '/api/v1/financial-goals/7/activities', params: { page: 2 } })
  })

  it('uses exact supplied mutation keys and correct routes', async () => {
    apiRequest.mockResolvedValue({ data: { data: { id: 7 } } })
    await goals.createGoal({ name: 'Trip', target_centavos: 100 }, 'create-key')
    await goals.updateGoal(7, { name: 'Trip 2' }, 'edit-key')
    await goals.allocateGoal(7, 50, 'add-key')
    await goals.withdrawGoal(7, 20, 'take-key')
    await goals.transitionGoal(7, 'complete', 'finish-key')
    expect(apiRequest.mock.calls.map(([config]) => [config.method, config.url, config.headers['Idempotency-Key']])).toEqual([
      ['post', '/api/v1/financial-goals', 'create-key'],
      ['patch', '/api/v1/financial-goals/7', 'edit-key'],
      ['post', '/api/v1/financial-goals/7/allocations', 'add-key'],
      ['post', '/api/v1/financial-goals/7/withdrawals', 'take-key'],
      ['post', '/api/v1/financial-goals/7/complete', 'finish-key'],
    ])
    expect(apiRequest.mock.calls[2][0].data).toEqual({ amount_centavos: 50 })
    expect(apiRequest.mock.calls[4][1]).toEqual({ csrf: true })
  })

  it('keeps typed API errors available for server field and conflict messages', async () => {
    const error = { status: 409, code: 'goal_account_shortfall', errors: {} }
    apiRequest.mockRejectedValue(error)
    await expect(goals.transitionGoal(7, 'complete', 'same-key')).rejects.toBe(error)
  })
})
