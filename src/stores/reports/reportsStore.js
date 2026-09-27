import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { getFinancialReport, getFinancialReportContributions } from '@/services/reportsService'

export const useReportsStore = defineStore('reports', () => {
  const overview = shallowRef(null)
  const loading = shallowRef(false)
  const error = shallowRef(null)
  const detail = shallowRef(null)
  const detailLoading = shallowRef(false)
  const detailError = shallowRef(null)
  let overviewEpoch = 0
  let detailEpoch = 0
  let overviewController = null
  let detailController = null

  async function loadOverview(scope) {
    const epoch = ++overviewEpoch
    overviewController?.abort()
    overviewController = new AbortController()
    overview.value = null
    loading.value = true
    error.value = null
    clearDetail()
    try {
      const result = await getFinancialReport(scope, { signal: overviewController.signal })
      if (epoch === overviewEpoch) overview.value = result
      return result
    } catch (requestError) {
      if (epoch === overviewEpoch && requestError?.name !== 'AbortError' && requestError?.code !== 'ERR_CANCELED') error.value = requestError
      return null
    } finally {
      if (epoch === overviewEpoch) loading.value = false
    }
  }

  function clearOverview() {
    overviewEpoch += 1
    overviewController?.abort()
    overview.value = null
    loading.value = false
    error.value = null
    clearDetail()
  }

  function clearDetail() {
    detailEpoch += 1
    detailController?.abort()
    detail.value = null
    detailError.value = null
    detailLoading.value = false
  }

  async function loadDetail(scope, target, { append = false } = {}) {
    const epoch = ++detailEpoch
    detailController?.abort()
    detailController = new AbortController()
    detailLoading.value = true
    detailError.value = null
    if (!append) detail.value = null
    try {
      const result = await getFinancialReportContributions(scope, target, { signal: detailController.signal })
      if (epoch === detailEpoch) {
        detail.value = append && detail.value
          ? { ...result, contributions: [...detail.value.contributions, ...result.contributions] }
          : result
      }
      return result
    } catch (requestError) {
      if (epoch === detailEpoch && requestError?.name !== 'AbortError' && requestError?.code !== 'ERR_CANCELED') detailError.value = requestError
      return null
    } finally {
      if (epoch === detailEpoch) detailLoading.value = false
    }
  }

  return { overview, loading, error, detail, detailLoading, detailError, loadOverview, clearOverview, loadDetail, clearDetail }
})
