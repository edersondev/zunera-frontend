import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/budgetService', () => ({
  getBudgetMonth: vi.fn(),
  createBudgetMonth: vi.fn(),
  createBudgetPlan: vi.fn(),
  updateBudgetPlan: vi.fn(),
  removeBudgetPlan: vi.fn(),
  copyBudgetMonth: vi.fn(),
}))

vi.mock('@/services/categoryService', () => ({
  listCategories: vi.fn(),
}))

const { getBudgetMonth, createBudgetMonth, createBudgetPlan, copyBudgetMonth } =
  await import('@/services/budgetService')
const { listCategories } = await import('@/services/categoryService')
const { useBudgetStore } = await import('../budgetStore')

function money(amountCentavos) {
  return { amount_centavos: amountCentavos, currency_code: 'BRL' }
}

function summary(overrides = {}) {
  return {
    total_planned: money(100_000),
    budgeted_realized: money(40_000),
    actual_available: money(60_000),
    overall_utilization_percent: 40,
    overall_status: 'within',
    unbudgeted_expenses: money(0),
    total_expenses: money(40_000),
    expected: null,
    projected_spending: null,
    projected_available: null,
    projected_status: null,
    ...overrides,
  }
}

function plan(overrides = {}) {
  return {
    id: 11,
    category: { id: 3, name: 'Mercado', classification: 'expense', origin: 'personal', status: 'active' },
    planned: money(100_000),
    realized: money(40_000),
    available: money(60_000),
    utilization_percent: 40,
    status: 'within',
    excess: money(0),
    expected: null,
    projected_spending: null,
    projected_available: null,
    projected_status: null,
    is_read_only: false,
    ...overrides,
  }
}

function monthPayload(budget) {
  return {
    period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
    budget,
  }
}

describe('budgetStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the selected month and exposes summary and plans', async () => {
    getBudgetMonth.mockResolvedValue(monthPayload({ id: 7, period: {}, summary: summary(), plans: [plan()] }))
    const store = useBudgetStore()

    await store.fetchMonth()

    expect(getBudgetMonth).toHaveBeenCalledWith(store.selectedMonth.year, store.selectedMonth.month)
    expect(store.hasBudget).toBe(true)
    expect(store.summary.overall_status).toBe('within')
    expect(store.plans).toHaveLength(1)
  })

  it('keeps an empty month as a normal state and finds a previous copy source', async () => {
    getBudgetMonth
      .mockResolvedValueOnce(monthPayload(null))
      .mockResolvedValueOnce(monthPayload({ id: 6, period: {}, summary: summary(), plans: [] }))
    const store = useBudgetStore()
    store.setSelectedMonth(2026, 9)

    await store.fetchMonth()
    await store.findPreviousBudgetSource()

    expect(store.hasBudget).toBe(false)
    expect(store.copySource).toEqual({ id: 6, year: 2026, month: 8 })
    expect(getBudgetMonth).toHaveBeenLastCalledWith(2026, 8)
  })

  it('creates a month when adding the first plan and refreshes the selected month after mutations', async () => {
    getBudgetMonth.mockResolvedValue(monthPayload(null))
    createBudgetMonth.mockResolvedValue(monthPayload({ id: 7, period: {}, summary: summary(), plans: [] }))
    createBudgetPlan.mockResolvedValue(
      monthPayload({ id: 7, period: {}, summary: summary(), plans: [plan()] }),
    )
    const store = useBudgetStore()
    await store.fetchMonth()

    await store.addPlan({ category_id: 3, planned_amount_centavos: 100_000 })

    expect(createBudgetMonth).toHaveBeenCalledWith(store.selectedMonth.year, store.selectedMonth.month)
    expect(createBudgetPlan).toHaveBeenCalledWith(7, { category_id: 3, planned_amount_centavos: 100_000 })
    expect(store.plans).toHaveLength(1)
  })

  it('moves the selected month to the copied destination', async () => {
    getBudgetMonth.mockResolvedValue(
      monthPayload({ id: 7, period: {}, summary: summary(), plans: [plan()] }),
    )
    copyBudgetMonth.mockResolvedValue(
      monthPayload({ id: 8, period: {}, summary: summary({ budgeted_realized: money(0) }), plans: [plan()] }),
    )
    const store = useBudgetStore()
    await store.fetchMonth()

    await store.copyMonth({ year: 2026, month: 10 }, 7)

    expect(copyBudgetMonth).toHaveBeenCalledWith(7, {
      destination_year: 2026,
      destination_month: 10,
    })
  })

  it('surfaces request failures and ignores duplicate submissions while one is in flight', async () => {
    const failure = Object.assign(new Error('conflict'), { code: 'budget_plan_conflict' })
    getBudgetMonth.mockResolvedValue(
      monthPayload({ id: 7, period: {}, summary: summary(), plans: [plan()] }),
    )
    let resolveMutation
    createBudgetPlan.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve
        }),
    )
    const store = useBudgetStore()
    await store.fetchMonth()

    const first = store.addPlan({ category_id: 4, planned_amount_centavos: 10_000 })
    const second = await store.addPlan({ category_id: 4, planned_amount_centavos: 10_000 })
    resolveMutation(monthPayload({ id: 7, period: {}, summary: summary(), plans: [plan()] }))
    await first

    expect(second).toBeNull()
    expect(createBudgetPlan).toHaveBeenCalledTimes(1)

    createBudgetPlan.mockRejectedValueOnce(failure)
    const failed = await store.addPlan({ category_id: 5, planned_amount_centavos: 10_000 })
    expect(failed).toBeNull()
    expect(store.mutationError.code).toBe('budget_plan_conflict')
  })

  it('filters active expense categories that are not already planned', async () => {
    listCategories.mockResolvedValue([
      { id: 3, name: 'Mercado', classification: 'expense', status: 'active' },
      { id: 4, name: 'Salário', classification: 'income', status: 'active' },
      { id: 5, name: 'Transporte', classification: 'expense', status: 'active' },
      { id: 6, name: 'Antiga', classification: 'expense', status: 'archived' },
    ])
    getBudgetMonth.mockResolvedValue(
      monthPayload({ id: 7, period: {}, summary: summary(), plans: [plan()] }),
    )
    const store = useBudgetStore()
    await store.fetchMonth()
    await store.loadCategories()

    expect(store.categories).toHaveLength(4)
    expect(store.availableExpenseCategories.map((category) => category.id)).toEqual([5])
  })
})
