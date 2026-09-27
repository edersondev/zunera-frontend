<script setup>
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseChart from '@/components/charts/BaseChart.vue'
import { useChartTheme } from '@/composables/useChartTheme'
import { useReportMotion } from '@/composables/reports/useReportMotion'
import { formatDashboardCurrency, formatDashboardPercent } from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({ items: { type: Array, required: true }, kind: { type: String, required: true }, locale: { type: String, default: 'pt-BR' } })
const emit = defineEmits(['detail'])
const { t } = useI18n()
const { theme: chartTheme } = useChartTheme()
const { reducedMotion } = useReportMotion()
const expanded = shallowRef(false)
const top = computed(() => props.items.slice(0, 6))
const visible = computed(() => expanded.value ? props.items : top.value)
const series = computed(() => [{ name: t(props.kind === 'income' ? 'reports.income' : 'reports.expenses'), data: top.value.map((item) => item.total.amount_centavos / 100) }])
const options = computed(() => ({
  chart: { animations: { enabled: !reducedMotion.value } },
  colors: [props.kind === 'income' ? chartTheme.value.income : chartTheme.value.expense],
  plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
  dataLabels: { enabled: false },
  xaxis: { categories: top.value.map((item) => item.category.name), labels: { formatter: (value) => formatDashboardCurrency(Math.round(Number(value) * 100), { locale: props.locale }), style: { colors: props.kind === 'income' ? chartTheme.value.income : chartTheme.value.expense } } },
  yaxis: { labels: { maxWidth: 120 } },
  tooltip: { y: { formatter: (value) => formatDashboardCurrency(Math.round(value * 100), { locale: props.locale }) } },
}))
</script>

<template>
  <section class="report-card" :class="kind === 'income' ? 'report-income-chart' : 'report-expense-chart'" :aria-labelledby="`report-${kind}-categories-heading`" :data-test="`report-${kind}-categories`">
    <h2 :id="`report-${kind}-categories-heading`">{{ t(kind === 'income' ? 'reports.categoriesIncome' : 'reports.categoriesExpense') }}</h2>
    <p v-if="!items.length">{{ t(kind === 'income' ? 'reports.noIncome' : 'reports.noExpenses') }}</p>
    <template v-else>
      <BaseChart v-if="items.length > 1" type="bar" :series="series" :options="options" :theme="chartTheme" :label="t(kind === 'income' ? 'reports.categoriesIncome' : 'reports.categoriesExpense')" :height="Math.max(180, top.length * 42)" />
      <div v-if="items.length === 1" class="single-progress" role="img" :aria-label="`${items[0].category.name}: ${formatDashboardPercent(items[0].share_percent, locale)}`"><span :style="{ width: `${Math.max(0, Math.min(100, items[0].share_percent ?? 0))}%` }" /></div>
      <ol :id="`report-${kind}-categories-list`" class="category-list">
        <li v-for="item in visible" :key="item.category.id">
          <div class="category-heading"><strong>{{ item.category.name }} <span v-if="item.category.status === 'archived'" class="status">({{ t('reports.archived') }})</span></strong><span :class="kind === 'income' ? 'report-income-amount' : 'report-expense-amount'">{{ formatDashboardCurrency(item.total.amount_centavos, { locale }) }}</span></div>
          <div class="category-meta"><span>{{ t('reports.share') }}: {{ formatDashboardPercent(item.share_percent, locale) }}</span><ElButton link type="primary" :aria-label="`${t('reports.details')}: ${item.category.name}`" @click="emit('detail', { metric: `${kind}_category`, metric_id: item.category.id, label: item.category.name })">{{ t('reports.details') }}</ElButton></div>
        </li>
      </ol>
      <ElButton v-if="items.length > 6" text type="primary" :aria-expanded="expanded" :aria-controls="`report-${kind}-categories-list`" data-test="report-categories-expand" @click="expanded = !expanded">{{ t(expanded ? 'reports.showTopCategories' : 'reports.showAllCategories') }}</ElButton>
    </template>
  </section>
</template>

<style scoped>
.report-card { display: grid; gap: 12px; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); min-width: 0; } h2, p { margin: 0; } h2 { font-size: 18px; } p, .status, .category-meta { color: var(--color-text-muted); } .category-list { display: grid; gap: 0; padding-left: 24px; margin: 0; } li { padding: 8px 0; border-bottom: 1px solid var(--color-border); min-width: 0; } .category-heading, .category-meta { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 4px 8px; } .category-heading span { font-variant-numeric: tabular-nums; } .category-heading strong { overflow-wrap: anywhere; } .status { font-weight: 400; font-size: 12px; } .single-progress { height: 7px; border-radius: 99px; background: var(--color-surface-tertiary); overflow: hidden; } .single-progress span { display: block; height: 100%; background: var(--color-action-primary); } .report-card :deep(.apexcharts-canvas) { max-width: 100%; }
</style>
