import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  getDashboardAccounts,
  getDashboardEvolution,
  getDashboardExpenseDistribution,
  getDashboardRecentActivity,
  getDashboardSummary,
  getDashboardUpcomingActivity,
} from '@/services/dashboardService'

function createSlice() {
  return {
    data: shallowRef(null),
    loading: shallowRef(false),
    error: shallowRef(null),
  }
}

export const useDashboardStore = defineStore('dashboard', () => {
  const period = shallowRef({ preset: 'current_month', from: null, to: null })

  const summarySlice = createSlice()
  const accountsSlice = createSlice()
  const distributionSlice = createSlice()
  const evolutionSlice = createSlice()
  const recentActivitySlice = createSlice()
  const upcomingActivitySlice = createSlice()

  const slices = [
    summarySlice,
    accountsSlice,
    distributionSlice,
    evolutionSlice,
    recentActivitySlice,
    upcomingActivitySlice,
  ]

  const isLoading = computed(() => slices.some((slice) => slice.loading.value))
  const hasError = computed(() => slices.some((slice) => slice.error.value !== null))
  const hasNoActiveAccounts = computed(
    () => (accountsSlice.data.value?.accounts?.length ?? 1) === 0,
  )

  async function loadSlice(slice, loader) {
    slice.loading.value = true
    slice.error.value = null

    try {
      slice.data.value = await loader()
      return slice.data.value
    } catch (requestError) {
      slice.error.value = requestError
      return null
    } finally {
      slice.loading.value = false
    }
  }

  function setPeriod(nextPeriod) {
    period.value = {
      preset: nextPeriod.preset ?? 'current_month',
      from: nextPeriod.from ?? null,
      to: nextPeriod.to ?? null,
    }
  }

  function fetchSummary() {
    return loadSlice(summarySlice, () => getDashboardSummary(period.value))
  }

  function fetchAccounts() {
    return loadSlice(accountsSlice, () => getDashboardAccounts())
  }

  function fetchExpenseDistribution() {
    return loadSlice(distributionSlice, () => getDashboardExpenseDistribution(period.value))
  }

  function fetchEvolution() {
    return loadSlice(evolutionSlice, () => getDashboardEvolution(period.value))
  }

  function fetchRecentActivity() {
    return loadSlice(recentActivitySlice, () => getDashboardRecentActivity())
  }

  function fetchUpcomingActivity() {
    return loadSlice(upcomingActivitySlice, () => getDashboardUpcomingActivity())
  }

  function loadPeriodSections() {
    return Promise.all([fetchSummary(), fetchExpenseDistribution(), fetchEvolution()])
  }

  function refreshAll() {
    return Promise.all([
      fetchSummary(),
      fetchAccounts(),
      fetchExpenseDistribution(),
      fetchEvolution(),
      fetchRecentActivity(),
      fetchUpcomingActivity(),
    ])
  }

  return {
    period,
    setPeriod,
    summary: summarySlice.data,
    summaryLoading: summarySlice.loading,
    summaryError: summarySlice.error,
    fetchSummary,
    accounts: accountsSlice.data,
    accountsLoading: accountsSlice.loading,
    accountsError: accountsSlice.error,
    fetchAccounts,
    distribution: distributionSlice.data,
    distributionLoading: distributionSlice.loading,
    distributionError: distributionSlice.error,
    fetchExpenseDistribution,
    evolution: evolutionSlice.data,
    evolutionLoading: evolutionSlice.loading,
    evolutionError: evolutionSlice.error,
    fetchEvolution,
    recentActivity: recentActivitySlice.data,
    recentActivityLoading: recentActivitySlice.loading,
    recentActivityError: recentActivitySlice.error,
    fetchRecentActivity,
    upcomingActivity: upcomingActivitySlice.data,
    upcomingActivityLoading: upcomingActivitySlice.loading,
    upcomingActivityError: upcomingActivitySlice.error,
    fetchUpcomingActivity,
    isLoading,
    hasError,
    hasNoActiveAccounts,
    loadPeriodSections,
    refreshAll,
  }
})
