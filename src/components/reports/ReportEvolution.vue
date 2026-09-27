<script setup>
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseChart from '@/components/charts/BaseChart.vue'
import ReportDetailedBreakdown from './ReportDetailedBreakdown.vue'
import { useChartTheme } from '@/composables/useChartTheme'
import { useReportMotion } from '@/composables/reports/useReportMotion'
import { formatDashboardCurrency, formatDashboardDate, resultDirection } from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({ intervals: { type: Array, required: true }, granularity: { type: String, default: 'day' }, locale: { type: String, default: 'pt-BR' } })
const { t } = useI18n()
const { theme: chartTheme } = useChartTheme()
const { reducedMotion } = useReportMotion()
const narrowLayout = shallowRef(false)
function updateLayout() { narrowLayout.value = window.innerWidth < 640 }
onMounted(() => { updateLayout(); window.addEventListener('resize', updateLayout) })
onUnmounted(() => window.removeEventListener('resize', updateLayout))
const dateValue = (value) => Date.parse(`${value}T12:00:00Z`)
const intervalLabel = (row) => row.from === row.to ? formatDashboardDate(row.from, props.locale) : `${formatDashboardDate(row.from, props.locale)} – ${formatDashboardDate(row.to, props.locale)}`
const series = computed(() => [
  { name: t('reports.income'), data: props.intervals.map((row) => ({ x: dateValue(row.from), y: row.realized_income.amount_centavos / 100 })) },
  { name: t('reports.expenses'), data: props.intervals.map((row) => ({ x: dateValue(row.from), y: row.realized_expenses.amount_centavos / 100 })) },
])
const options = computed(() => ({
  chart: { animations: { enabled: !reducedMotion.value }, zoom: { enabled: false } },
  colors: [chartTheme.value.income, chartTheme.value.expense],
  dataLabels: { enabled: false },
  stroke: { width: 3, curve: 'straight' },
  markers: { size: props.intervals.length < 35 ? 3 : 0 },
  xaxis: { type: 'datetime', tickAmount: narrowLayout.value ? 3 : 7, labels: { datetimeUTC: true, hideOverlappingLabels: true, formatter: (_value, timestamp) => formatDashboardDate(new Date(timestamp).toISOString().slice(0, 10), props.locale) } },
  yaxis: { labels: { formatter: (value) => formatDashboardCurrency(Math.round(value * 100), { locale: props.locale }) } },
  tooltip: { shared: true, intersect: false, custom: ({ dataPointIndex }) => {
    const row = props.intervals[dataPointIndex]
    if (!row) return ''
    return `<div class="report-chart-tooltip"><strong>${intervalLabel(row)}</strong><span>${t('reports.income')}: <b class="report-income-amount">${formatDashboardCurrency(row.realized_income.amount_centavos, { locale: props.locale })}</b></span><span>${t('reports.expenses')}: <b class="report-expense-amount">${formatDashboardCurrency(row.realized_expenses.amount_centavos, { locale: props.locale })}</b></span><span>${t('reports.result')}: <b class="report-result-${resultDirection(row.financial_result.amount_centavos)}">${formatDashboardCurrency(row.financial_result.amount_centavos, { locale: props.locale })}</b></span></div>`
  } },
}))
</script>

<template>
  <section class="report-card" aria-labelledby="report-evolution-heading" data-test="report-evolution">
    <div class="heading"><h2 id="report-evolution-heading">{{ t('reports.evolution') }}</h2><span class="granularity">{{ t(`reports.granularity.${granularity}`) }}</span></div>
    <p v-if="!intervals.length">{{ t('reports.noActivity') }}</p>
    <template v-else>
      <BaseChart type="line" :series="series" :options="options" :theme="chartTheme" :label="`${t('reports.evolution')}: ${t('reports.income')}, ${t('reports.expenses')}`" :height="narrowLayout ? 280 : 360" />
      <ReportDetailedBreakdown :intervals="intervals" :locale="locale" />
    </template>
  </section>
</template>

<style scoped>
.report-card { display: grid; gap: 14px; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); min-width: 0; } .heading { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; } h2, p { margin: 0; } h2 { font-size: 20px; } p, .granularity { color: var(--color-text-muted); } .granularity { font-size: 13px; } .report-card :deep(.apexcharts-canvas) { max-width: 100%; } .report-card :deep(.report-chart-tooltip) { display: grid; gap: 4px; padding: 10px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
</style>
