import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  confirmCardOccurrence,
  createRecurringTransaction,
  dismissCardOccurrence,
  endRecurringTransaction,
  getRecurringTransaction,
  listRecurringTransactionOccurrences,
  listRecurringTransactions,
  pauseRecurringTransaction,
  retryCardOccurrence,
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
  let selectionRequest = 0
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
    const page = (meta.value.current_page ?? 1) + 1
    filters.value = { ...filters.value, page }

    return fetch({ append: true })
  }

  async function select(id) {
    const request = ++selectionRequest
    const rule = await getRecurringTransaction(id)
    if (request !== selectionRequest) return rule
    selected.value = rule
    items.value = items.value.map((item) => item.id === rule.id ? rule : item)
    await fetchOccurrences(id, {}, request)

    return rule
  }

  async function fetchOccurrences(id, params = {}, request = selectionRequest) {
    loadingOccurrences.value = true
    try {
      const result = await listRecurringTransactionOccurrences(id, { per_page: 50, ...params })
      if (request === selectionRequest) {
        occurrences.value = result.items
        occurrenceMeta.value = result.meta
      }

      return result
    } finally {
      if (request === selectionRequest) loadingOccurrences.value = false
    }
  }

  async function findNewestReviewableOccurrence(id) {
    const rule = await select(id)
    if (selected.value?.id !== id || !rule.reviewable_occurrence_count) return null

    const actionable = (row) => ['expected', 'awaiting_over_limit', 'failed'].includes(row.state)
    let page = 1
    let result = { items: occurrences.value, meta: occurrenceMeta.value }

    while (page <= (result.meta?.last_page ?? 1)) {
      const match = result.items.find(actionable)
      if (match) return match
      page += 1
      if (page <= (result.meta?.last_page ?? 1)) {
        result = await listRecurringTransactionOccurrences(id, { per_page: 50, page })
        if (selected.value?.id !== id) return null
      }
    }

    return null
  }

  async function runOccurrenceAction(ruleId, occurrenceId, operation, action) {
    const actionId = `${ruleId}:${occurrenceId}`
    saving.value = true
    error.value = null
    validationErrors.value = {}

    try {
      let result
      try {
        result = await action(keyFor(operation, actionId))
      } catch (value) {
        if (value?.status === 409 || value?.status === 422) clearRetryKey(operation, actionId)
        applyError(value)
        throw value
      }

      clearRetryKey(operation, actionId)
      try {
        await fetchOccurrences(ruleId)
      } catch (value) {
        // The mutation succeeded. Keep its returned state even when readback fails.
        applyError(value)
      }

      return result.occurrence
    } finally {
      saving.value = false
    }
  }

  const confirmOccurrence = (ruleId, occurrenceId, payload) =>
    runOccurrenceAction(ruleId, occurrenceId, `confirm:${JSON.stringify(payload ?? {})}`, (key) =>
      confirmCardOccurrence(ruleId, occurrenceId, payload, key))

  const dismissOccurrence = (ruleId, occurrenceId) =>
    runOccurrenceAction(ruleId, occurrenceId, 'dismiss', (key) =>
      dismissCardOccurrence(ruleId, occurrenceId, key))

  const retryOccurrence = (ruleId, occurrenceId) =>
    runOccurrenceAction(ruleId, occurrenceId, 'retry', (key) =>
      retryCardOccurrence(ruleId, occurrenceId, key))
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

  function clearValidationErrors() {
    error.value = null
    validationErrors.value = {}
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
    findNewestReviewableOccurrence,
    create,
    update,
    pause,
    resume,
    end,
    confirmOccurrence,
    dismissOccurrence,
    retryOccurrence,
    clearValidationErrors,
    clearFeedback,
  }
})
