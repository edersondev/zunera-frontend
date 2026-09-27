<script setup>
import { computed, onMounted, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import ReportPeriodSelector from '@/components/reports/ReportPeriodSelector.vue'
import ReportFilterBar from '@/components/reports/ReportFilterBar.vue'
import ReportSummary from '@/components/reports/ReportSummary.vue'
import ReportEvolution from '@/components/reports/ReportEvolution.vue'
import ReportCategoryBreakdown from '@/components/reports/ReportCategoryBreakdown.vue'
import ReportComparison from '@/components/reports/ReportComparison.vue'
import ReportAccountActivity from '@/components/reports/ReportAccountActivity.vue'
import ReportContributionDrawer from '@/components/reports/ReportContributionDrawer.vue'
import '@/components/reports/reportAmounts.css'
import { useReportScope } from '@/composables/reports/useReportScope'
import { useReportsStore } from '@/stores/reports/reportsStore'
import { useLocale } from '@/composables/useLocale'
import { listFinancialAccounts } from '@/services/financialAccountService'
import { listCategories } from '@/services/categoryService'

const { t } = useI18n()
const { activeLocale } = useLocale()
const { scope, key, updateScope, clearFilters } = useReportScope()
const store = useReportsStore()
const { overview, loading, error, detail, detailLoading, detailError } = storeToRefs(store)
const accounts = shallowRef([])
const categories = shallowRef([])
const drawerOpen = shallowRef(false)
const target = shallowRef(null)
const applied = computed(() => overview.value?.scope ?? null)
const displayScope = computed(() => ({ ...scope.value, current_period: applied.value?.current_period }))
const hasIncompletePeriod = computed(() => (scope.value.preset === 'custom' && (!scope.value.from || !scope.value.to)) || (scope.value.preset === 'historical_month' && !scope.value.month))
const emptyMessage = computed(() => {
  const empty = overview.value?.empty_states
  if (empty?.no_filter_matches) return t('reports.noFilterMatches')
  if (empty?.no_activity) return t('reports.noActivity')
  return null
})

watch(key, () => {
  drawerOpen.value = false
  target.value = null
  if (hasIncompletePeriod.value) { store.clearOverview(); return }
  store.loadOverview(scope.value)
}, { immediate: true })

onMounted(async () => {
  const results = await Promise.allSettled([
    listFinancialAccounts('active'), listFinancialAccounts('archived'),
    listCategories('active'), listCategories('archived'),
  ])
  accounts.value = [...(results[0].status === 'fulfilled' ? results[0].value : []), ...(results[1].status === 'fulfilled' ? results[1].value : [])]
  categories.value = [...(results[2].status === 'fulfilled' ? results[2].value : []), ...(results[3].status === 'fulfilled' ? results[3].value : [])]
})

function openDetail(nextTarget) {
  target.value = { which_period: 'current', ...nextTarget }
  drawerOpen.value = true
  store.loadDetail(scope.value, target.value)
}

function closeDetail(value) {
  drawerOpen.value = value
  if (!value) store.clearDetail()
}

function loadMore() {
  if (!detail.value?.next_cursor || !target.value) return
  store.loadDetail(scope.value, { ...target.value, cursor: detail.value.next_cursor }, { append: true })
}

function sectionUnavailable(name) { return overview.value?.section_states?.[name]?.status === 'unavailable' }
function sectionMessage(name) { return overview.value?.section_states?.[name]?.message || t('reports.sectionUnavailable') }
</script>

<template>
  <div class="reports-view" data-test="reports-view">
    <PageHeader :title="t('reports.title')" :description="t('reports.description')" />
    <ReportPeriodSelector :scope="displayScope" :locale="activeLocale" :loading="loading" @change="updateScope" />
    <ReportFilterBar :scope="scope" :accounts="accounts" :categories="categories" @change="updateScope" @reset="clearFilters" />
    <p v-if="hasIncompletePeriod" class="state-note">{{ t('reports.apply') }} {{ t('reports.period').toLowerCase() }}</p>
    <ElSkeleton v-else-if="loading && !overview" :rows="8" animated data-test="report-loading" />
    <ElAlert v-else-if="error" type="error" :title="t('reports.error')" :closable="false" data-test="report-error"><ElButton data-test="report-retry" @click="store.loadOverview(scope)">{{ t('reports.retry') }}</ElButton></ElAlert>
    <template v-else-if="overview">
      <p v-if="emptyMessage" class="state-note" data-test="report-empty">{{ emptyMessage }}</p>
      <ElAlert v-if="sectionUnavailable('summary')" type="warning" :title="sectionMessage('summary')" :closable="false" data-test="report-summary-unavailable"><ElButton @click="store.loadOverview(scope)">{{ t('reports.retry') }}</ElButton></ElAlert>
      <ReportSummary v-else-if="overview.summary" :summary="overview.summary" :comparison="sectionUnavailable('comparison') ? null : overview.comparison" :locale="activeLocale" @detail="openDetail" />
      <ElAlert v-if="sectionUnavailable('evolution')" type="warning" :title="sectionMessage('evolution')" :closable="false" data-test="report-evolution-unavailable"><ElButton @click="store.loadOverview(scope)">{{ t('reports.retry') }}</ElButton></ElAlert>
      <ReportEvolution v-else-if="overview.evolution" :intervals="overview.evolution" :granularity="overview.evolution_granularity" :locale="activeLocale" />
      <div class="category-grid">
        <ElAlert v-if="sectionUnavailable('expense_categories')" type="warning" :title="sectionMessage('expense_categories')" :closable="false" data-test="report-expense_categories-unavailable"><ElButton @click="store.loadOverview(scope)">{{ t('reports.retry') }}</ElButton></ElAlert>
        <ReportCategoryBreakdown v-else-if="overview.expense_categories" :items="overview.expense_categories" kind="expense" :locale="activeLocale" @detail="openDetail" />
        <ElAlert v-if="sectionUnavailable('income_categories')" type="warning" :title="sectionMessage('income_categories')" :closable="false" data-test="report-income_categories-unavailable"><ElButton @click="store.loadOverview(scope)">{{ t('reports.retry') }}</ElButton></ElAlert>
        <ReportCategoryBreakdown v-else-if="overview.income_categories" :items="overview.income_categories" kind="income" :locale="activeLocale" @detail="openDetail" />
      </div>
      <ElAlert v-if="sectionUnavailable('accounts')" type="warning" :title="sectionMessage('accounts')" :closable="false" data-test="report-accounts-unavailable"><ElButton @click="store.loadOverview(scope)">{{ t('reports.retry') }}</ElButton></ElAlert>
      <ReportAccountActivity v-else-if="overview.accounts" :accounts="overview.accounts" :unattributed-card-expenses="overview.unattributed_card_expenses" :suppress-movements="Boolean(applied?.filters?.category_id || applied?.filters?.transaction_type)" :locale="activeLocale" @detail="openDetail" />
      <ElAlert v-if="sectionUnavailable('comparison')" type="warning" :title="sectionMessage('comparison')" :closable="false" data-test="report-comparison-unavailable"><ElButton @click="store.loadOverview(scope)">{{ t('reports.retry') }}</ElButton></ElAlert>
      <ReportComparison v-else-if="overview.comparison" :comparison="overview.comparison" :scope="overview.scope" :locale="activeLocale" @detail="openDetail" />
      <p v-if="overview.empty_states?.no_previous_activity" class="state-note">{{ t('reports.noPreviousActivity') }}</p>
    </template>
    <ReportContributionDrawer :model-value="drawerOpen" :target="target" :detail="detail" :loading="detailLoading" :error="detailError" :locale="activeLocale" @update:model-value="closeDetail" @load-more="loadMore" @retry="store.loadDetail(scope, target)" />
  </div>
</template>

<style scoped>
.reports-view { display: grid; gap: 20px; min-width: 0; } .reports-view :deep(.page-header) { margin-bottom: 0; } .state-note { margin: 0; color: var(--color-text-muted); } .category-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; min-width: 0; align-items: start; } @media(max-width: 900px) { .category-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
