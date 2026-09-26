import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/financialGoalService', () => ({
  newIdempotencyKey: vi.fn(() => 'key'),
  listGoals: vi.fn(), getGoal: vi.fn(), getGoalSummary: vi.fn(), getDashboardGoals: vi.fn(),
  listGoalActivities: vi.fn(), createGoal: vi.fn(), updateGoal: vi.fn(),
  allocateGoal: vi.fn(), withdrawGoal: vi.fn(), transitionGoal: vi.fn(),
}))
const service = await import('@/services/financialGoalService')
const { useFinancialGoalStore } = await import('../financialGoalStore')

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  service.listGoals.mockResolvedValue({ items: [], meta: {} })
  service.getGoalSummary.mockResolvedValue({ active_count: 0 })
  service.listGoalActivities.mockResolvedValue({ items: [], meta: {} })
})

describe('goal lifecycle actions', () => {
  it('offers active actions based on whether designation is zero', async () => {
    const store = useFinancialGoalStore()
    service.getGoal.mockResolvedValueOnce({ id: 1, status: 'active', allocated_centavos: 0 })
      .mockResolvedValueOnce({ id: 1, status: 'active', allocated_centavos: 500 })
    await store.fetchGoal(1)
    expect(store.availableActions).toEqual(['allocate', 'update', 'complete', 'archive'])
    await store.fetchGoal(1)
    expect(store.availableActions).toEqual(['allocate', 'update', 'complete', 'withdraw'])
  })

  it('offers only reopen or restore for completed and archived states', async () => {
    const store = useFinancialGoalStore()
    service.getGoal.mockResolvedValueOnce({ id: 1, status: 'completed', allocated_centavos: 500 })
      .mockResolvedValueOnce({ id: 1, status: 'archived', allocated_centavos: 0 })
    await store.fetchGoal(1)
    expect(store.availableActions).toEqual(['reopen'])
    await store.fetchGoal(1)
    expect(store.availableActions).toEqual(['restore'])
  })

  it('retains the server conflict and retries the same transition key', async () => {
    const store = useFinancialGoalStore()
    const conflict = { status: 409, code: 'goal_account_shortfall', message: 'Resolve the linked account shortfall' }
    service.transitionGoal.mockRejectedValueOnce(conflict).mockResolvedValueOnce({ id: 1, status: 'completed' })
    service.getGoal.mockResolvedValue({ id: 1, status: 'completed', allocated_centavos: 500 })
    expect((await store.transition(1, 'complete')).ok).toBe(false)
    expect(store.mutationError).toEqual(conflict)
    expect((await store.transition(1, 'complete')).ok).toBe(true)
    expect(service.transitionGoal).toHaveBeenNthCalledWith(1, 1, 'complete', 'key')
    expect(service.transitionGoal).toHaveBeenNthCalledWith(2, 1, 'complete', 'key')
    expect(store.availableActions).toEqual(['reopen'])
  })
})
