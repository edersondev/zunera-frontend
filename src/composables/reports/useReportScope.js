import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export const REPORT_PRESETS = ['current_month', 'previous_month', 'historical_month', 'current_year', 'previous_year', 'custom']
const FILTER_KEYS = ['account_id', 'category_id', 'transaction_type']

function single(value) {
  return typeof value === 'string' ? value : null
}

function positiveId(value) {
  const text = typeof value === 'number' ? String(value) : single(value)
  return text && /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : null
}

function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : null
}

export function normalizeReportScope(query = {}) {
  const preset = REPORT_PRESETS.includes(single(query.preset)) ? query.preset : 'current_month'
  const month = preset === 'historical_month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(single(query.month) ?? '') ? query.month : null
  const from = preset === 'custom' ? isoDate(query.from) : null
  const to = preset === 'custom' ? isoDate(query.to) : null
  const account_id = positiveId(query.account_id)
  const category_id = positiveId(query.category_id)
  const transaction_type = ['income', 'expense'].includes(single(query.transaction_type)) ? query.transaction_type : null
  return { preset, month, from, to, account_id, category_id, transaction_type }
}

export function reportScopeQuery(scope) {
  const result = {}
  if (scope.preset !== 'current_month') result.preset = scope.preset
  if (scope.preset === 'historical_month' && scope.month) result.month = scope.month
  if (scope.preset === 'custom') {
    if (scope.from) result.from = scope.from
    if (scope.to) result.to = scope.to
  }
  for (const key of FILTER_KEYS) if (scope[key] !== null && scope[key] !== undefined) result[key] = String(scope[key])
  return result
}

export function useReportScope() {
  const route = useRoute()
  const router = useRouter()
  const scope = computed(() => normalizeReportScope(route.query))
  const key = computed(() => JSON.stringify(reportScopeQuery(scope.value)))

  watch(() => route.query, (query) => {
    const canonical = reportScopeQuery(normalizeReportScope(query))
    const existing = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== null))
    if (JSON.stringify(Object.keys(canonical).sort().map((field) => [field, canonical[field]])) !== JSON.stringify(Object.keys(existing).sort().map((field) => [field, existing[field]]))) {
      router.replace({ name: 'reports', query: canonical })
    }
  }, { immediate: true })

  function updateScope(patch) {
    const next = normalizeReportScope({ ...scope.value, ...patch, ...Object.fromEntries(FILTER_KEYS.filter((field) => patch[field] === null).map((field) => [field, null])) })
    if (patch.preset && patch.preset !== scope.value.preset) {
      if (patch.preset !== 'custom') { next.from = null; next.to = null }
      if (patch.preset !== 'historical_month') next.month = null
    }
    return router.push({ name: 'reports', query: reportScopeQuery(next) })
  }

  function clearFilters() {
    return updateScope({ account_id: null, category_id: null, transaction_type: null })
  }

  return { scope, key, updateScope, clearFilters }
}
