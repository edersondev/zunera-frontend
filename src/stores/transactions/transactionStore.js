import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  createTransaction,
  getTransaction,
  listFinancialHistory,
  removeTransaction,
  restoreTransaction,
  updateTransaction,
} from '@/services/transactionService'
import { restoreTransfer } from '@/services/transferService'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'

export const useTransactionStore = defineStore('transactions', () => {
  const items = shallowRef([])
  const meta = shallowRef({ total: 0 })
  const selected = shallowRef(null)
  const filters = shallowRef({ view: 'active', per_page: 50 })
  const loading = shallowRef(false)
  const saving = shallowRef(false)
  const error = shallowRef(null)
  const validationErrors = shallowRef({})
  const notice = shallowRef(null)
  const lastBalanceImpact = shallowRef([])
  const retryKeys = new Map()
  const hasMore = computed(() => (meta.value.current_page ?? 1) < (meta.value.last_page ?? 1))
  /** Income/expense/result totals reported by the backend; transfers are excluded there. */
  const totals = computed(() => meta.value.totals ?? null)

  function applyError(value) {
    error.value = value
    validationErrors.value = value?.errors ?? {}
  }

  /**
   * Mixed history entries use movement_kind and movement_date. Income and expense
   * entries keep the transaction shape the existing screens already expect, while
   * transfer entries stay discriminated with both account sides.
   */
  function normalizeEntry(entry) {
    if (entry?.movement_kind === 'transfer' || entry?.movement_kind === 'recurring') return entry

    return { ...entry, type: entry.movement_kind, transaction_date: entry.movement_date }
  }

  function accountSnapshots(accounts) {
    return new Map((accounts?.accounts ?? []).map((account) => [account.id, account]))
  }

  /** Balance deltas for the accounts the financial-account store refreshed after a mutation. */
  function balanceImpact(before, accounts) {
    return [...accountSnapshots(accounts).values()]
      .filter((account) => before.has(account.id))
      .map((account) => ({
        id: account.id,
        name: account.name,
        before: before.get(account.id).current_balance_centavos,
        after: account.current_balance_centavos,
      }))
      .map((impact) => ({ ...impact, delta: impact.after - impact.before }))
      .filter((impact) => impact.delta !== 0)
  }

  async function fetch({ append = false } = {}) {
    loading.value = true
    error.value = null

    try {
      const result = await listFinancialHistory(filters.value)
      const entries = (result.items ?? []).map(normalizeEntry)
      items.value = append ? [...items.value, ...entries] : entries
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

    return fetch()
  }

  async function loadMore() {
    if (!hasMore.value || loading.value) return
    filters.value = { ...filters.value, page: (meta.value.current_page ?? 1) + 1 }

    return fetch({ append: true })
  }

  /** Accepts a history entry (transfer rows carry their own detail) or a transaction id. */
  async function select(idOrEntry) {
    if (idOrEntry !== null && typeof idOrEntry === 'object') {
      selected.value = idOrEntry

      return selected.value
    }

    selected.value = await getTransaction(idOrEntry)

    return selected.value
  }

  function retrySignature(action, payload = {}) {
    return `${action}:${JSON.stringify(payload, Object.keys(payload).sort())}`
  }

  async function mutate(action, payload, work) {
    if (saving.value) return null
    saving.value = true
    error.value = null
    validationErrors.value = {}
    notice.value = null

    const accounts = useFinancialAccountStore()
    const before = accountSnapshots(accounts)
    const signature = retrySignature(action, payload)
    const idempotencyKey = retryKeys.get(signature) ?? crypto.randomUUID()

    try {
      const result = await work(idempotencyKey)
      retryKeys.delete(signature)
      notice.value = result?.meta?.notice ?? null
      try {
        await Promise.all([fetch(), accounts.fetchAccounts(), accounts.fetchSummary()])
        lastBalanceImpact.value = balanceImpact(before, accounts)
      } catch (value) {
        applyError(value)
      }

      return result?.transaction ?? result
    } catch (value) {
      retryKeys.set(signature, idempotencyKey)
      applyError(value)
      throw value
    } finally {
      saving.value = false
    }
  }

  const create = (payload) => mutate('create', payload, (idempotencyKey) => createTransaction(payload, idempotencyKey))
  const update = (id, payload) => mutate(`update:${id}`, payload, (idempotencyKey) => updateTransaction(id, payload, idempotencyKey))
  const remove = (id) => mutate(`remove:${id}`, {}, (idempotencyKey) => removeTransaction(id, idempotencyKey))
  const restore = (id, payload) => mutate(`restore:${id}`, payload, (idempotencyKey) => restoreTransaction(id, payload, idempotencyKey))
  const restoreHistoryEntry = (entry, payload = {}) => {
    const restoreMovement = entry?.movement_kind === 'transfer' ? restoreTransfer : restoreTransaction

    return mutate(`restore:${entry.id}`, payload, (idempotencyKey) => restoreMovement(entry.id, payload, idempotencyKey))
  }

  function clearNotice() {
    notice.value = null
    lastBalanceImpact.value = []
  }

  function clearValidationErrors() {
    validationErrors.value = {}
  }

  return {
    items,
    meta,
    selected,
    filters,
    loading,
    saving,
    error,
    validationErrors,
    notice,
    lastBalanceImpact,
    hasMore,
    totals,
    fetch,
    setFilters,
    loadMore,
    select,
    create,
    update,
    remove,
    restore,
    restoreHistoryEntry,
    clearNotice,
    clearValidationErrors,
  }
})
