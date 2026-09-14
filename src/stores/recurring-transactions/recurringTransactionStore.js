import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  createRecurringTransaction,
  endRecurringTransaction,
  getRecurringTransaction,
  listRecurringTransactionOccurrences,
  listRecurringTransactions,
  pauseRecurringTransaction,
  resumeRecurringTransaction,
  updateRecurringTransaction,
} from '@/services/recurringTransactionService'

const DEFAULT_FILTERS = Object.freeze({ per_page: 50 })

export const useRecurringTransactionStore = defineStore('recurring-transactions', () => {
  const items = shallowRef([])
  const meta = shallowRef({ total: 0 })
  const selected = shallowRef(null)
  const occurrences = shallowRef([])
  const occurrenceMeta = shallowRef({ total: 0 })
  const filters = shallowRef({ ...DEFAULT_FILTERS })
  const loading = shallowRef(false)
  const saving = shallowRef(false)
  const loadingOccurrences = shallowRef(false)
  const error = shallowRef(null)
  const validationErrors = shallowRef({})
  const notice = shallowRef(null)
  const retryKeys = new Map()
  const hasMore = computed(() => (meta.value.current_page ?? 1) < (meta.value.last_page ?? 1))

  function applyError(value) {
    error.value = value
    validationErrors.value = value?.errors ?? {}
  }

  function keyFor(operation, id) {
    const key = `${operation}:${id}`
    if (!retryKeys.has(key)) retryKeys.set(key, crypto.randomUUID())

    return retryKeys.get(key)
  }

  function clearRetryKey(operation, id) {
    retryKeys.delete(`${operation}:${id}`)
  }

  async function fetch({ append = false } = {}) {
    loading.value = true
    error.value = null

    try {
      const result = await listRecurringTransactions(filters.value)
      items.value = append ? [...items.value, ...result.items] : result.items
      meta.value = result.meta

      return result
    } catch (value) {
      applyError(value)
      throw value
    } finally {
      loading.value = false
    }
  }

  async function setFilters(value) {
    filters.value = { ...filters.value, ...value, page: 1 }
    await fetch()

    return items.value
  }

  async function loadMore() {
    return fetch({ append: true, page: (meta.value.current_page ?? 1) + 1 })
  }

  async function select(id) {
    const rule = await getRecurringTransaction(id)
    selected.value = rule
    await fetchOccurrences(id)

    return rule
  }

  async function fetchOccurrences(id, params = {}) {
    loadingOccurrences.value = true
    try {
      const result = await listRecurringTransactionOccurrences(id, { per_page: 50, ...params })
      occurrences.value = result.items
      occurrenceMeta.value = result.meta

      return result
    } finally {
      loadingOccurrences.value = false
    }
  }

  async function runMutation(operation, id, action, { noticeKey } = {}) {
    saving.value = true
    error.value = null
    validationErrors.value = {}
    notice.value = null

    try {
      const result = await action(keyFor(operation, id))
      clearRetryKey(operation, id)
      selected.value = result.rule
      notice.value = noticeKey ?? null
      await fetch()

      return result.rule
    } catch (value) {
      applyError(value)
      throw value
    } finally {
      saving.value = false
    }
  }

  const create = (payload) =>
    runMutation('create', 'new', (key) => createRecurringTransaction(payload, key), {
      noticeKey: 'recurringTransactions.created',
    })

  const update = (id, payload) =>
    runMutation('update', id, (key) => updateRecurringTransaction(id, payload, key), {
      noticeKey: 'recurringTransactions.saved',
    })

  const pause = (id) =>
    runMutation('pause', id, (key) => pauseRecurringTransaction(id, key), {
      noticeKey: 'recurringTransactions.pausedSuccess',
    })

  const resume = (id) =>
    runMutation('resume', id, (key) => resumeRecurringTransaction(id, key), {
      noticeKey: 'recurringTransactions.resumedSuccess',
    })

  const end = (id) =>
    runMutation('end', id, (key) => endRecurringTransaction(id, key), {
      noticeKey: 'recurringTransactions.endedSuccess',
    })

  function clearFeedback() {
    error.value = null
    validationErrors.value = {}
    notice.value = null
  }

  return {
    items,
    meta,
    selected,
    occurrences,
    occurrenceMeta,
    filters,
    loading,
    saving,
    loadingOccurrences,
    error,
    validationErrors,
    notice,
    hasMore,
    fetch,
    setFilters,
    loadMore,
    select,
    fetchOccurrences,
    create,
    update,
    pause,
    resume,
    end,
    clearFeedback,
  }
})
