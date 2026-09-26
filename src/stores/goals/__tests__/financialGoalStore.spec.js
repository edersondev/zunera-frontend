import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/financialGoalService', () => ({
  newIdempotencyKey: vi.fn(() => 'generated-key'),
  listGoals: vi.fn(), getGoal: vi.fn(), getGoalSummary: vi.fn(), getDashboardGoals: vi.fn(),
  listGoalActivities: vi.fn(), createGoal: vi.fn(), updateGoal: vi.fn(),
  allocateGoal: vi.fn(), withdrawGoal: vi.fn(), transitionGoal: vi.fn(),
}))
const service = await import('@/services/financialGoalService')
const { useFinancialGoalStore } = await import('../financialGoalStore')

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  service.listGoals.mockResolvedValue({ items: [{ id: 7 }], meta: { total: 1 }, links: {} })
  service.getGoal.mockResolvedValue({ id: 7, status: 'active' })
  service.getGoalSummary.mockResolvedValue({ active_count: 1 })
  service.getDashboardGoals.mockResolvedValue([{ id: 7 }])
  service.listGoalActivities.mockResolvedValue({ items: [], meta: {}, links: {} })
})

describe('financialGoalStore', () => {
  it('keeps owned list, summary, detail, and dashboard slices separate', async () => {
    const store = useFinancialGoalStore()
    await Promise.all([store.fetchGoals(), store.fetchSummary(), store.fetchGoal(7), store.fetchDashboard()])
    expect(store.goals).toEqual([{ id: 7 }])
    expect(store.summary.active_count).toBe(1)
    expect(store.goal.id).toBe(7)
    expect(store.dashboardGoals).toEqual([{ id: 7 }])
  })

  it('reuses one key for exact retry and refreshes server projections after success', async () => {
    const store = useFinancialGoalStore()
    const error = { status: 0, message: 'offline' }
    service.allocateGoal.mockRejectedValueOnce(error).mockResolvedValueOnce({ id: 7, allocated_centavos: 50 })
    expect((await store.allocate(7, 50)).ok).toBe(false)
    expect((await store.allocate(7, 50)).ok).toBe(true)
    expect(service.allocateGoal).toHaveBeenNthCalledWith(1, 7, 50, 'generated-key')
    expect(service.allocateGoal).toHaveBeenNthCalledWith(2, 7, 50, 'generated-key')
    expect(service.getGoal).toHaveBeenCalledWith(7)
    expect(service.getGoalSummary).toHaveBeenCalled()
    expect(service.listGoalActivities).toHaveBeenCalledWith(7, { page: 1 })
  })

  it('pages activity and retries the same withdrawal key before refreshing server state', async () => {
    const store = useFinancialGoalStore()
    service.listGoalActivities.mockResolvedValue({ items: [{ id: 9, type: 'withdrawn' }], meta: { current_page: 2, last_page: 3 } })
    await store.fetchActivities(7, 2)
    expect(service.listGoalActivities).toHaveBeenCalledWith(7, { page: 2 })
    expect(store.activities).toEqual([{ id: 9, type: 'withdrawn' }])
    expect(store.activityMeta.current_page).toBe(2)
    service.withdrawGoal.mockRejectedValueOnce({ status: 0, message: 'offline' }).mockResolvedValueOnce({ id: 7, allocated_centavos: 30 })
    expect((await store.withdraw(7, 20)).ok).toBe(false)
    expect((await store.withdraw(7, 20)).ok).toBe(true)
    expect(service.withdrawGoal).toHaveBeenNthCalledWith(1, 7, 20, 'generated-key')
    expect(service.withdrawGoal).toHaveBeenNthCalledWith(2, 7, 20, 'generated-key')
    expect(service.getGoal).toHaveBeenCalledWith(7)
    expect(service.listGoalActivities).toHaveBeenCalledWith(7, { page: 1 })
  })

  it('keeps an unavailable summary separate from the goal list', async () => {
    const store = useFinancialGoalStore()
    service.getGoalSummary.mockRejectedValue(new Error('Summary unavailable'))
    await store.fetchGoals()
    await store.fetchSummary()
    expect(store.goals).toEqual([{ id: 7 }])
    expect(store.summary).toBeNull()
    expect(store.summaryError.message).toBe('Summary unavailable')
    expect(store.summaryLoading).toBe(false)
  })

  it('retains typed capacity and lifecycle errors for user-facing correction', async () => {
    const store = useFinancialGoalStore()
    service.transitionGoal.mockRejectedValue({ status: 409, code: 'goal_account_shortfall', message: 'Resolve shortfall' })
    const outcome = await store.transition(7, 'complete')
    expect(outcome.ok).toBe(false)
    expect(store.mutationError.code).toBe('goal_account_shortfall')
    store.clearMutationError()
    expect(store.mutationError).toBeNull()
  })
})
