import { shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { getFinancialReport, getFinancialReportContributions, reportScopeParams } from '@/services/reportsService'

const MAX_RECONCILIATION_ATTEMPTS = 3
const scopeKey = (scope) => JSON.stringify(reportScopeParams(scope))
const sameAppliedScope = (left, right) => Boolean(left && right && JSON.stringify(left) === JSON.stringify(right))

export const useReportsStore = defineStore('reports', () => {
  const overview = shallowRef(null)
  const loading = shallowRef(false)
  const error = shallowRef(null)
  const detail = shallowRef(null)
  const detailLoading = shallowRef(false)
  const detailError = shallowRef(null)
  const changeNotice = shallowRef(false)
  let overviewEpoch = 0
  let detailEpoch = 0
  let activeScopeKey = null
  let overviewController = null
  let detailController = null

  async function loadOverview(scope) {
    const epoch = ++overviewEpoch
    activeScopeKey = scopeKey(scope)
    overviewController?.abort()
    overviewController = new AbortController()
    overview.value = null
    loading.value = true
    error.value = null
    clearDetail()
    changeNotice.value = false
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
    activeScopeKey = null
    overviewController?.abort()
    overview.value = null
    loading.value = false
    error.value = null
    clearDetail()
    changeNotice.value = false
  }

  function clearChangeNotice() { changeNotice.value = false }

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
      if (epoch !== detailEpoch) return null

      const revisionMismatch = !overview.value?.source_revision
        || overview.value.source_revision !== result.source_revision
        || activeScopeKey !== scopeKey(scope)
        || !sameAppliedScope(overview.value?.scope, result.scope)
        || (append && detail.value && (detail.value.source_revision !== result.source_revision
          || detail.value.total?.amount_centavos !== result.total?.amount_centavos))

      if (revisionMismatch) {
        if (overview.value?.source_revision) changeNotice.value = true
        const firstTarget = { ...target }
        delete firstTarget.cursor
        return await refreshPair(scope, firstTarget, epoch, detailController.signal, Boolean(overview.value?.source_revision))
      }

      detail.value = append && detail.value
        ? { ...result, contributions: [...detail.value.contributions, ...result.contributions] }
        : result
      return result
    } catch (requestError) {
      if (epoch === detailEpoch && requestError?.name !== 'AbortError' && requestError?.code !== 'ERR_CANCELED') {
        detailError.value = requestError
        if (!overview.value) error.value = requestError
      }
      return null
    } finally {
      if (epoch === detailEpoch) detailLoading.value = false
    }
  }

  async function refreshPair(scope, target, detailRequestEpoch, signal, observedChange) {
    const reportRequestEpoch = overviewEpoch
    overview.value = null
    detail.value = null
    loading.value = true
    error.value = null

    try {
      for (let attempt = 0; attempt < MAX_RECONCILIATION_ATTEMPTS; attempt += 1) {
        const [nextOverview, nextDetail] = await Promise.all([
          getFinancialReport(scope, { signal }),
          getFinancialReportContributions(scope, target, { signal }),
        ])
        if (detailRequestEpoch !== detailEpoch || reportRequestEpoch !== overviewEpoch || activeScopeKey !== scopeKey(scope)) return null
        if (nextOverview?.source_revision && nextOverview.source_revision === nextDetail?.source_revision
          && sameAppliedScope(nextOverview.scope, nextDetail.scope)) {
          overview.value = nextOverview
          detail.value = nextDetail
          changeNotice.value = observedChange || changeNotice.value
          return nextDetail
        }
      }
      throw new Error('Report sources kept changing. Retry to refresh the report and contributions.')
    } finally {
      if (detailRequestEpoch === detailEpoch && reportRequestEpoch === overviewEpoch) loading.value = false
    }
  }

  return { overview, loading, error, detail, detailLoading, detailError, changeNotice, loadOverview, clearOverview, loadDetail, clearDetail, clearChangeNotice }
})
