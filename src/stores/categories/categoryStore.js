import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  archiveCategory,
  createCategory,
  getCategory,
  listCategories,
  restoreCategory,
  updateCategory,
} from '@/services/categoryService'

export const useCategoryStore = defineStore('categories', () => {
  const categories = shallowRef([])
  const archivedCategories = shallowRef([])
  const selectedCategory = shallowRef(null)
  const loading = shallowRef(false)
  const creating = shallowRef(false)
  const updating = shallowRef(false)
  const lifecycleLoading = shallowRef(false)
  const error = shallowRef(null)
  const validationErrors = shallowRef({})
  const isBusy = computed(
    () => loading.value || creating.value || updating.value || lifecycleLoading.value,
  )

  function applyError(requestError) {
    error.value = requestError
    validationErrors.value = requestError?.errors ?? {}
  }
  async function fetchCategories(status = 'active') {
    loading.value = true
    error.value = null
    try {
      const result = await listCategories(status)
      if (status === 'active') categories.value = result
      else archivedCategories.value = result
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      loading.value = false
    }
  }
  async function fetchCategory(id) {
    loading.value = true
    error.value = null
    try {
      selectedCategory.value = await getCategory(id)
      return selectedCategory.value
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      loading.value = false
    }
  }
  async function create(payload) {
    if (creating.value) return null
    creating.value = true
    error.value = null
    validationErrors.value = {}
    try {
      const category = await createCategory(payload)
      categories.value = [...categories.value, category]
      return category
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      creating.value = false
    }
  }
  async function update(id, payload) {
    if (updating.value) return null
    updating.value = true
    error.value = null
    validationErrors.value = {}
    try {
      const updated = await updateCategory(id, payload)
      selectedCategory.value = updated
      categories.value = categories.value.map((item) => (item.id === id ? updated : item))
      archivedCategories.value = archivedCategories.value.map((item) =>
        item.id === id ? updated : item,
      )
      return updated
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      updating.value = false
    }
  }
  async function archive(category) {
    if (lifecycleLoading.value) return null
    lifecycleLoading.value = true
    error.value = null
    try {
      const updated = await archiveCategory(category.id)
      categories.value = categories.value.filter((item) => item.id !== category.id)
      archivedCategories.value = [updated, ...archivedCategories.value]
      return updated
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      lifecycleLoading.value = false
    }
  }
  async function restore(category) {
    if (lifecycleLoading.value) return null
    lifecycleLoading.value = true
    error.value = null
    try {
      const updated = await restoreCategory(category.id)
      archivedCategories.value = archivedCategories.value.filter((item) => item.id !== category.id)
      categories.value = [...categories.value, updated]
      return updated
    } catch (requestError) {
      applyError(requestError)
      throw requestError
    } finally {
      lifecycleLoading.value = false
    }
  }
  function resetSelection() {
    selectedCategory.value = null
    error.value = null
    validationErrors.value = {}
  }
  return {
    categories,
    archivedCategories,
    selectedCategory,
    loading,
    creating,
    updating,
    lifecycleLoading,
    error,
    validationErrors,
    isBusy,
    fetchCategories,
    fetchCategory,
    create,
    update,
    archive,
    restore,
    resetSelection,
  }
})
