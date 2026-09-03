import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  archiveFinancialAccount,
  createFinancialAccount,
  getFinancialAccount,
  getFinancialAccountSummary,
  listFinancialAccounts,
  restoreFinancialAccount,
  updateFinancialAccount,
} from '@/services/financialAccountService'

export const useFinancialAccountStore = defineStore('financialAccounts', () => {
  const accounts = shallowRef([])
  const archivedAccounts = shallowRef([])
  const summary = shallowRef({ active_account_count: 0, active_combined_balance_centavos: 0, currency_code: 'BRL' })
  const selectedAccount = shallowRef(null)
  const loading = shallowRef(false)
  const creating = shallowRef(false)
  const updating = shallowRef(false)
  const lifecycleLoading = shallowRef(false)
  const error = shallowRef(null)
  const validationErrors = shallowRef({})

  const isBusy = computed(() => loading.value || creating.value || updating.value || lifecycleLoading.value)

  function applyError(requestError) {
    error.value = requestError
    validationErrors.value = requestError?.errors ?? {}
  }

  async function fetchAccounts(status = 'active') {
    loading.value = true
    error.value = null

    try {
      const result = await listFinancialAccounts(status)
      if (status === 'active') {
        accounts.value = result
      } else {
        archivedAccounts.value = result
      }
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function fetchSummary() {
    summary.value = await getFinancialAccountSummary()
  }

  async function fetchAccount(id) {
    loading.value = true
    error.value = null

    try {
      selectedAccount.value = await getFinancialAccount(id)
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      loading.value = false
    }
  }

  async function create(payload) {
    if (creating.value) {
      return null
    }

    creating.value = true
    error.value = null
    validationErrors.value = {}

    try {
      const account = await createFinancialAccount(payload)
      accounts.value = [account, ...accounts.value]
      summary.value = await getFinancialAccountSummary()
      return account
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      creating.value = false
    }
  }

  async function update(id, payload) {
    updating.value = true
    error.value = null
    validationErrors.value = {}

    try {
      const updated = await updateFinancialAccount(id, payload)
      selectedAccount.value = updated
      accounts.value = accounts.value.map((account) => (account.id === id ? updated : account))
      archivedAccounts.value = archivedAccounts.value.map((account) => (account.id === id ? updated : account))
      summary.value = await getFinancialAccountSummary()
      return updated
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      updating.value = false
    }
  }

  async function archive(account) {
    lifecycleLoading.value = true
    error.value = null

    try {
      const updated = await archiveFinancialAccount(account.id)
      accounts.value = accounts.value.filter((item) => item.id !== account.id)
      archivedAccounts.value = [updated, ...archivedAccounts.value]
      if (selectedAccount.value?.id === account.id) {
        selectedAccount.value = updated
      }
      summary.value = await getFinancialAccountSummary()
      return updated
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      lifecycleLoading.value = false
    }
  }

  async function restore(account) {
    lifecycleLoading.value = true
    error.value = null

    try {
      const updated = await restoreFinancialAccount(account.id)
      archivedAccounts.value = archivedAccounts.value.filter((item) => item.id !== account.id)
      accounts.value = [updated, ...accounts.value]
      if (selectedAccount.value?.id === account.id) {
        selectedAccount.value = updated
      }
      summary.value = await getFinancialAccountSummary()
      return updated
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      lifecycleLoading.value = false
    }
  }

  function resetSelection() {
    selectedAccount.value = null
    error.value = null
    validationErrors.value = {}
  }

  return {
    accounts,
    archivedAccounts,
    summary,
    selectedAccount,
    loading,
    creating,
    updating,
    lifecycleLoading,
    error,
    validationErrors,
    isBusy,
    fetchAccounts,
    fetchSummary,
    fetchAccount,
    create,
    update,
    archive,
    restore,
    resetSelection,
  }
})
