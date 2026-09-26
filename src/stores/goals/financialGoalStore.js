import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import * as service from '@/services/financialGoalService'

export const useFinancialGoalStore = defineStore('financial-goals', () => {
  const goals = shallowRef([])
  const completedGoals = shallowRef([])
  const archivedGoals = shallowRef([])
  const listMeta = shallowRef(null)
  const goal = shallowRef(null)
  const summary = shallowRef(null)
  const summaryLoading = shallowRef(false)
  const summaryError = shallowRef(null)
  const dashboardGoals = shallowRef(null)
  const activities = shallowRef([])
  const activityMeta = shallowRef(null)
  const availableActions = computed(() => {
    if (goal.value?.status === 'completed') return ['reopen']
    if (goal.value?.status === 'archived') return ['restore']
    if (goal.value?.status !== 'active') return []
    return ['allocate', 'update', 'complete', ...(goal.value.allocated_centavos > 0 ? ['withdraw'] : ['archive'])]
  })
  const loading = shallowRef(false)
  const error = shallowRef(null)
  const dashboardLoading = shallowRef(false)
  const dashboardError = shallowRef(null)
  const submitting = shallowRef(false)
  const mutationError = shallowRef(null)
  let pendingMutation = null

  async function fetchGoals(status = 'active', page = 1) {
    loading.value = true
    error.value = null
    try {
      const response = await service.listGoals({ status, page })
      if (status === 'active') goals.value = response.items
      if (status === 'completed') completedGoals.value = response.items
      if (status === 'archived') archivedGoals.value = response.items
      listMeta.value = response.meta
      return response
    } catch (failure) {
      error.value = failure
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchGoal(id) {
    loading.value = true
    error.value = null
    try {
      goal.value = await service.getGoal(id)
      return goal.value
    } catch (failure) {
      error.value = failure
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    summaryLoading.value = true
    summaryError.value = null
    try {
      summary.value = await service.getGoalSummary()
      return summary.value
    } catch (failure) {
      summary.value = null
      summaryError.value = failure
      return null
    } finally {
      summaryLoading.value = false
    }
  }

  async function fetchDashboard() {
    dashboardLoading.value = true
    dashboardError.value = null
    try {
      dashboardGoals.value = await service.getDashboardGoals()
      return dashboardGoals.value
    } catch (failure) {
      dashboardError.value = failure
      return null
    } finally {
      dashboardLoading.value = false
    }
  }

  async function fetchActivities(id, page = 1) {
    try {
      const response = await service.listGoalActivities(id, { page })
      activities.value = response.items
      activityMeta.value = response.meta
      return response
    } catch (failure) {
      error.value = failure
      return null
    }
  }

  async function mutate(fingerprint, perform, id = null) {
    if (submitting.value) return { ok: false, result: null }
    submitting.value = true
    mutationError.value = null
    const key = pendingMutation?.fingerprint === fingerprint ? pendingMutation.key : service.newIdempotencyKey()
    pendingMutation = { fingerprint, key }
    try {
      const result = await perform(key)
      pendingMutation = null
      const goalId = id ?? result.id
      await Promise.all([fetchGoals(), fetchSummary(), fetchGoal(goalId), fetchActivities(goalId, 1)])
      return { ok: true, result }
    } catch (failure) {
      mutationError.value = failure
      return { ok: false, result: null }
    } finally {
      submitting.value = false
    }
  }

  const clearMutationError = () => { mutationError.value = null }

  const create = (payload) => mutate(JSON.stringify(['create', payload]), (key) => service.createGoal(payload, key))
  const update = (id, payload) => mutate(JSON.stringify(['update', id, payload]), (key) => service.updateGoal(id, payload, key), id)
  const allocate = (id, amount) => mutate(JSON.stringify(['allocate', id, amount]), (key) => service.allocateGoal(id, amount, key), id)
  const withdraw = (id, amount) => mutate(JSON.stringify(['withdraw', id, amount]), (key) => service.withdrawGoal(id, amount, key), id)
  const transition = (id, action) => mutate(JSON.stringify(['transition', id, action]), (key) => service.transitionGoal(id, action, key), id)

  return {
    goals, completedGoals, archivedGoals, listMeta, goal, summary, summaryLoading, summaryError, dashboardGoals,
    activities, activityMeta, availableActions, loading, error, dashboardLoading, dashboardError,
    submitting, mutationError, fetchGoals, fetchGoal, fetchSummary, fetchDashboard,
    fetchActivities, clearMutationError, create, update, allocate, withdraw, transition,
  }
})
