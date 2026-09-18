import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { listCategories } from '@/services/categoryService'
import {
  copyBudgetMonth,
  createBudgetMonth,
  createBudgetPlan,
  getBudgetMonth,
  removeBudgetPlan,
  updateBudgetPlan,
} from '@/services/budgetService'
import { businessMonth, shiftMonth } from '@/utils/budgets/budgetFormatters'

export const useBudgetStore = defineStore('budgets', () => {
  const selectedMonth = shallowRef(businessMonth())
  const monthData = shallowRef(null)
  const loading = shallowRef(false)
  const error = shallowRef(null)
  const submitting = shallowRef(false)
  const mutationError = shallowRef(null)
  const categories = shallowRef([])
  const categoriesError = shallowRef(null)
  const categoriesLoaded = shallowRef(false)
  const copySource = shallowRef(null)

  const budget = computed(() => monthData.value?.budget ?? null)
  const hasBudget = computed(() => budget.value !== null)
  const summary = computed(() => budget.value?.summary ?? null)
  const plans = computed(() => budget.value?.plans ?? [])
  const availableExpenseCategories = computed(() =>
    categories.value
      .filter((category) => category.classification === 'expense' && category.status === 'active')
      .filter((category) => !plans.value.some((plan) => plan.category.id === category.id)),
  )

  function setSelectedMonth(year, month) {
    selectedMonth.value = { year: Number(year), month: Number(month) }
    copySource.value = null
  }

  async function fetchMonth() {
    loading.value = true
    error.value = null

    try {
      monthData.value = await getBudgetMonth(selectedMonth.value.year, selectedMonth.value.month)
      return monthData.value
    } catch (requestError) {
      error.value = requestError
      return null
    } finally {
      loading.value = false
    }
  }

  async function createMonth() {
    return runMutation(
      () => createBudgetMonth(selectedMonth.value.year, selectedMonth.value.month),
      'create',
    )
  }

  async function addPlan(payload) {
    if (!budget.value) {
      const created = await createMonth()

      if (!created) return null
    }

    return runMutation(() => createBudgetPlan(budget.value.id, payload), 'plan')
  }

  async function updatePlan(planId, payload) {
    return runMutation(() => updateBudgetPlan(budget.value.id, planId, payload), 'plan')
  }

  async function removePlan(planId) {
    return runMutation(() => removeBudgetPlan(budget.value.id, planId), 'remove')
  }

  async function copyMonth(destination, sourceId = null) {
    const source = sourceId ?? budget.value?.id

    if (!source) return null

    return runMutation(
      () =>
        copyBudgetMonth(source, {
          destination_year: destination.year,
          destination_month: destination.month,
        }),
      'copy',
    )
  }

  /**
   * The API is owner-month scoped rather than list-based, so an empty month can
   * only offer "copy previous budget" once that neighbouring month is known to
   * own a budget.
   */
  async function findPreviousBudgetSource() {
    const previous = shiftMonth(selectedMonth.value, -1)

    try {
      const data = await getBudgetMonth(previous.year, previous.month)
      copySource.value = data.budget
        ? { id: data.budget.id, year: previous.year, month: previous.month }
        : null
    } catch {
      copySource.value = null
    }

    return copySource.value
  }

  async function runMutation(operation, kind) {
    if (submitting.value) return null

    submitting.value = true
    mutationError.value = null

    try {
      const result = await operation()

      if (kind === 'copy') {
        setSelectedMonth(result.period.year, result.period.month)
      }

      monthData.value = result

      return result
    } catch (requestError) {
      mutationError.value = requestError
      return null
    } finally {
      submitting.value = false
    }
  }

  async function loadCategories(force = false) {
    if (categoriesLoaded.value && !force) return categories.value

    categoriesError.value = null

    try {
      categories.value = await listCategories('active')
      categoriesLoaded.value = true

      return categories.value
    } catch (requestError) {
      categoriesError.value = requestError
      return []
    }
  }

  function clearMutationError() {
    mutationError.value = null
  }

  return {
    selectedMonth,
    monthData,
    loading,
    error,
    submitting,
    mutationError,
    categories,
    categoriesError,
    copySource,
    budget,
    hasBudget,
    summary,
    plans,
    availableExpenseCategories,
    setSelectedMonth,
    fetchMonth,
    createMonth,
    addPlan,
    updatePlan,
    removePlan,
    copyMonth,
    findPreviousBudgetSource,
    loadCategories,
    clearMutationError,
  }
})
