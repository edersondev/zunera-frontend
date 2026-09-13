import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  createTransfer,
  getTransfer,
  listTransfers,
  removeTransfer,
  restoreTransfer,
  updateTransfer,
} from '@/services/transferService'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'

export const useTransferStore = defineStore('transfers', () => {
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

  function applyError(value) {
    error.value = value
    validationErrors.value = value?.errors ?? {}
  }

  function accountSnapshots(accounts) {
    return new Map((accounts?.accounts ?? []).map((account) => [account.id, account]))
  }

  /** Balance deltas for both refreshed sides of the last mutation. */
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
      const result = await listTransfers(filters.value)
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

    return fetch()
  }

  async function loadMore() {
    if (!hasMore.value || loading.value) return
    filters.value = { ...filters.value, page: (meta.value.current_page ?? 1) + 1 }

    return fetch({ append: true })
  }

  async function select(id) {
    selected.value = await getTransfer(id)

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

      return result?.transfer ?? result
    } catch (value) {
      retryKeys.set(signature, idempotencyKey)
      applyError(value)
      throw value
    } finally {
      saving.value = false
    }
  }

  const create = (payload) =>
    mutate('create', payload, (idempotencyKey) => createTransfer(payload, idempotencyKey))
  const update = (id, payload) =>
    mutate(`update:${id}`, payload, (idempotencyKey) => updateTransfer(id, payload, idempotencyKey))
  const remove = (id) =>
    mutate(`remove:${id}`, {}, (idempotencyKey) => removeTransfer(id, idempotencyKey))
  const restore = (id, payload = {}) =>
    mutate(`restore:${id}`, payload, (idempotencyKey) => restoreTransfer(id, payload, idempotencyKey))

  function clearNotice() {
    notice.value = null
    lastBalanceImpact.value = []
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
    fetch,
    setFilters,
    loadMore,
    select,
    create,
    update,
    remove,
    restore,
    clearNotice,
  }
})
