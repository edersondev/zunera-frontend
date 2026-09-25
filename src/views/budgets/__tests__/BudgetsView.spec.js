import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { mount } from '@vue/test-utils'

const hoisted = vi.hoisted(() => ({ store: null }))

vi.mock('@/stores/budgets/budgetStore', () => ({
  useBudgetStore: () => hoisted.store,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
}))

const BudgetsView = (await import('../BudgetsView.vue')).default

const stubs = {
  ElAlert: {
    name: 'ElAlert',
    props: ['title'],
    template: '<div role="alert">{{ title }}<slot /></div>',
  },
  ElButton: {
    name: 'ElButton',
    props: ['disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  ElDialog: {
    name: 'ElDialog',
    props: ['modelValue'],
    template: '<section v-if="modelValue" role="dialog"><slot /><slot name="footer" /></section>',
  },
  ElTag: { name: 'ElTag', template: '<span class="tag"><slot /></span>' },
  ElForm: { name: 'ElForm', template: '<form><slot /></form>' },
  ElFormItem: { name: 'ElFormItem', template: '<label><slot /></label>' },
  ElSelect: { name: 'ElSelect', template: '<select><slot /></select>' },
  ElOption: { name: 'ElOption', template: '<option />' },
  CurrencyAmountInput: { name: 'CurrencyAmountInput', template: '<input />' },
}

function money(amountCentavos) {
  return { amount_centavos: amountCentavos, currency_code: 'BRL' }
}

function plan(overrides = {}) {
  return {
    id: 11,
    category: {
      id: 3,
      name: 'Mercado',
      classification: 'expense',
      origin: 'personal',
      status: 'active',
    },
    planned: money(100_000),
    realized: money(72_000),
    available: money(28_000),
    utilization_percent: 72,
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

function budget(plans = [plan()]) {
  return {
    id: 7,
    period: { year: 2026, month: 9, from: '2026-09-01', to: '2026-09-30' },
    summary: {
      total_planned: money(100_000),
      budgeted_realized: money(72_000),
      actual_available: money(28_000),
      overall_utilization_percent: 72,
      overall_status: 'within',
      unbudgeted_expenses: money(0),
      total_expenses: money(72_000),
      expected: null,
      projected_spending: null,
      projected_available: null,
      projected_status: null,
    },
    plans,
  }
}

function createStore(overrides = {}) {
  return reactive({
    selectedMonth: { year: 2026, month: 9 },
    loading: false,
    error: null,
    submitting: false,
    mutationError: null,
    copySource: null,
    hasBudget: true,
    budget: budget(),
    summary: budget().summary,
    plans: [plan()],
    availableExpenseCategories: [],
    fetchMonth: vi.fn(),
    createMonth: vi.fn(),
    addPlan: vi.fn(),
    updatePlan: vi.fn(),
    removePlan: vi.fn(),
    copyMonth: vi.fn(),
    loadCategories: vi.fn(),
    findPreviousBudgetSource: vi.fn(),
    clearMutationError: vi.fn(),
    setSelectedMonth: vi.fn(),
    ...overrides,
  })
}

function mountView() {
  return mount(BudgetsView, { global: { stubs } })
}

describe('BudgetsView', () => {
  beforeEach(() => {
    hoisted.store = createStore()
  })

  it('keeps a month without a budget as a normal empty state with a create action', async () => {
    hoisted.store = createStore({ hasBudget: false, budget: null, summary: null, plans: [] })
    const wrapper = mountView()

    expect(wrapper.text()).toContain('Nenhum orçamento neste mês')
    expect(wrapper.find('[data-test="budget-empty-copy"]').exists()).toBe(false)

    await wrapper.get('[data-test="budget-empty-create"]').trigger('click')

    expect(hoisted.store.createMonth).toHaveBeenCalled()
  })

  it('offers copy only when an eligible previous budget exists', async () => {
    hoisted.store = createStore({
      hasBudget: false,
      budget: null,
      summary: null,
      plans: [],
      copySource: { id: 6, year: 2026, month: 8 },
    })
    const wrapper = mountView()

    await wrapper.get('[data-test="budget-empty-copy"]').trigger('click')

    expect(hoisted.store.clearMutationError).toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CopyBudgetDialog' }).props('sourceMonth')).toEqual({
      id: 6,
      year: 2026,
      month: 8,
    })
  })

  it('renders derived values for a planned month', () => {
    const wrapper = mountView()

    expect(wrapper.text()).toContain('setembro de 2026')
    expect(wrapper.get('[data-test="budget-summary-realized"]').text()).toContain('720,00')
    expect(wrapper.get('[data-test="budget-plan-row"]').exists()).toBe(true)
  })

  it('moves one card installment from expected to realized without doubling projected spending', async () => {
    const expectedPlan = plan({
      realized: money(0), expected: money(15_000), projected_spending: money(15_000),
      available: money(100_000), projected_available: money(85_000),
    })
    const expectedBudget = budget([expectedPlan])
    expectedBudget.summary = {
      ...expectedBudget.summary, budgeted_realized: money(0), total_expenses: money(0),
      expected: money(15_000), projected_spending: money(15_000),
      actual_available: money(100_000), projected_available: money(85_000),
    }
    hoisted.store = createStore({ budget: expectedBudget, summary: expectedBudget.summary, plans: [expectedPlan] })
    const wrapper = mountView()
    expect(wrapper.get('[data-test="budget-summary-realized"]').text()).toContain('0,00')
    expect(wrapper.get('[data-test="budget-summary-projection"]').text()).toContain('150,00')

    hoisted.store.summary = {
      ...expectedBudget.summary, budgeted_realized: money(15_000), total_expenses: money(15_000),
      expected: money(0), projected_spending: money(15_000), actual_available: money(85_000),
    }
    hoisted.store.plans = [{ ...expectedPlan, realized: money(15_000), expected: money(0), projected_spending: money(15_000) }]
    await nextTick()

    expect(wrapper.get('[data-test="budget-summary-realized"]').text()).toContain('150,00')
    expect(wrapper.get('[data-test="budget-summary-projection"]').text()).toContain('150,00')
    expect(wrapper.get('[data-test="budget-plan-realized"]').text()).toContain('150,00')
  })

  it('keeps an archived plan read-only with an explicit label', () => {
    const archived = plan({
      is_read_only: true,
      category: {
        id: 3,
        name: 'Mercado',
        classification: 'expense',
        origin: 'personal',
        status: 'archived',
      },
    })
    hoisted.store = createStore({ plans: [archived], budget: budget([archived]) })
    const wrapper = mountView()

    expect(wrapper.text()).toContain('Arquivada')
    expect(wrapper.find('[data-test="budget-plan-edit"]').exists()).toBe(false)
  })

  it('shows a loading state instead of an empty month while fetching', () => {
    hoisted.store = createStore({
      loading: true,
      hasBudget: false,
      budget: null,
      summary: null,
      plans: [],
    })
    const wrapper = mountView()

    expect(wrapper.text()).toContain('Carregando orçamento')
    expect(wrapper.find('[data-test="budget-empty-create"]').exists()).toBe(false)
  })
})
