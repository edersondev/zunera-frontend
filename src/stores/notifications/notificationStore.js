import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  getNotifications,
  getNotificationSummary,
  getNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  openNotification,
  updateNotificationPreference,
} from '@/services/notificationService'

const EMPTY_SUMMARY = Object.freeze({ unread_count: 0, requires_action_count: 0 })
const DEFAULT_PREFERENCES = Object.freeze({ credit_cards: true, recurring_transactions: true, budgets: true, financial_goals: true })

export const useNotificationStore = defineStore('notifications', () => {
  const ownerId = shallowRef(null)
  const summary = shallowRef({ ...EMPTY_SUMMARY })
  const items = shallowRef([])
  const view = shallowRef('all')
  const nextCursor = shallowRef(null)
  const loading = shallowRef(false)
  const summaryLoading = shallowRef(false)
  const error = shallowRef(null)
  const preferences = shallowRef({ ...DEFAULT_PREFERENCES })
  const preferencesLoading = shallowRef(false)
  const preferencesError = shallowRef(null)
  const updatingCategory = shallowRef(null)
  let ownerEpoch = 0
  let pageEpoch = 0

  const unreadLabel = computed(() => {
    const count = summary.value.unread_count
    return count > 99 ? '99+' : count > 0 ? String(count) : ''
  })
  const hasMore = computed(() => Boolean(nextCursor.value))

  function reset() {
    ownerEpoch += 1
    pageEpoch += 1
    ownerId.value = null
    summary.value = { ...EMPTY_SUMMARY }
    items.value = []
    view.value = 'all'
    nextCursor.value = null
    loading.value = false
    summaryLoading.value = false
    error.value = null
    preferences.value = { ...DEFAULT_PREFERENCES }
    preferencesLoading.value = false
    preferencesError.value = null
    updatingCategory.value = null
  }

  function bindOwner(id) {
    if (id == null) {
      reset()
      return
    }
    if (ownerId.value === id) return
    reset()
    ownerId.value = id
  }

  async function loadSummary() {
    if (ownerId.value == null) return null
    const epoch = ownerEpoch
    summaryLoading.value = true
    try {
      const result = await getNotificationSummary()
      if (epoch === ownerEpoch) summary.value = result
      return epoch === ownerEpoch ? result : null
    } catch (requestError) {
      if (epoch === ownerEpoch && requestError?.status === 401) reset()
      return null
    } finally {
      if (epoch === ownerEpoch) summaryLoading.value = false
    }
  }

  async function loadFirst(nextView = 'all') {
    if (ownerId.value == null) return null
    const owner = ownerEpoch
    const page = ++pageEpoch
    view.value = nextView
    items.value = []
    nextCursor.value = null
    error.value = null
    loading.value = true
    try {
      const result = await getNotifications({ view: nextView, limit: 25 })
      if (owner === ownerEpoch && page === pageEpoch) {
        items.value = result.data
        nextCursor.value = result.next_cursor
      }
      return result
    } catch (requestError) {
      if (owner === ownerEpoch && page === pageEpoch) error.value = requestError
      if (owner === ownerEpoch && requestError?.status === 401) reset()
      return null
    } finally {
      if (owner === ownerEpoch && page === pageEpoch) loading.value = false
    }
  }

  async function loadMore() {
    if (ownerId.value == null || !nextCursor.value || loading.value) return null
    const owner = ownerEpoch
    const page = pageEpoch
    const cursor = nextCursor.value
    loading.value = true
    error.value = null
    try {
      const result = await getNotifications({ view: view.value, limit: 25, cursor })
      if (owner === ownerEpoch && page === pageEpoch) {
        items.value = [...items.value, ...result.data]
        nextCursor.value = result.next_cursor
      }
      return result
    } catch (requestError) {
      if (owner === ownerEpoch && page === pageEpoch) error.value = requestError
      if (owner === ownerEpoch && requestError?.status === 401) reset()
      return null
    } finally {
      if (owner === ownerEpoch && page === pageEpoch) loading.value = false
    }
  }

  function replaceItem(updated) {
    items.value = items.value.map((item) => item.id === updated.id ? updated : item)
    if (view.value === 'unread' && updated.read_at) {
      items.value = items.value.filter((item) => item.id !== updated.id)
    }
  }

  async function markRead(id) {
    const epoch = ownerEpoch
    try {
      const updated = await markNotificationRead(id)
      if (epoch !== ownerEpoch) return null
      replaceItem(updated)
      await loadSummary()
      return updated
    } catch (requestError) {
      if (epoch === ownerEpoch && requestError?.status === 401) reset()
      throw requestError
    }
  }

  async function markAllRead() {
    const epoch = ownerEpoch
    try {
      const result = await markAllNotificationsRead()
      if (epoch !== ownerEpoch) return null
      summary.value = result.summary
      if (view.value === 'unread') {
        items.value = []
        nextCursor.value = null
      } else {
        items.value = items.value.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))
      }
      return result
    } catch (requestError) {
      if (epoch === ownerEpoch && requestError?.status === 401) reset()
      throw requestError
    }
  }

  async function open(id) {
    const epoch = ownerEpoch
    try {
      const updated = await openNotification(id)
      if (epoch !== ownerEpoch) return null
      replaceItem(updated)
      await loadSummary()
      return updated
    } catch (requestError) {
      if (epoch === ownerEpoch && requestError?.status === 401) reset()
      throw requestError
    }
  }

  async function loadPreferences() {
    if (ownerId.value == null) return null
    const epoch = ownerEpoch
    preferencesLoading.value = true
    preferencesError.value = null
    try {
      const result = await getNotificationPreferences()
      if (epoch === ownerEpoch) preferences.value = result
      return epoch === ownerEpoch ? result : null
    } catch (requestError) {
      if (epoch === ownerEpoch && requestError?.status === 401) reset()
      else if (epoch === ownerEpoch) preferencesError.value = requestError
      return null
    } finally {
      if (epoch === ownerEpoch) preferencesLoading.value = false
    }
  }

  async function setPreference(category, enabled) {
    if (ownerId.value == null || !Object.hasOwn(DEFAULT_PREFERENCES, category)) return null
    const epoch = ownerEpoch
    updatingCategory.value = category
    preferencesError.value = null
    try {
      const result = await updateNotificationPreference(category, enabled)
      if (epoch === ownerEpoch) preferences.value = result
      return epoch === ownerEpoch ? result : null
    } catch (requestError) {
      if (epoch === ownerEpoch && requestError?.status === 401) reset()
      else if (epoch === ownerEpoch) preferencesError.value = requestError
      return null
    } finally {
      if (epoch === ownerEpoch) updatingCategory.value = null
    }
  }

  return {
    ownerId, summary, items, view, nextCursor, loading, summaryLoading, error,
    preferences, preferencesLoading, preferencesError, updatingCategory,
    unreadLabel, hasMore, reset, bindOwner, loadSummary, loadFirst, loadMore, markRead, markAllRead, open,
    loadPreferences, setPreference,
  }
})
