<script setup>
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseChart from '@/components/charts/BaseChart.vue'
import { useChartTheme } from '@/composables/useChartTheme'
import { formatDashboardCurrency, formatDashboardDate } from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({ intervals: { type: Array, required: true }, granularity: { type: String, default: 'day' }, locale: { type: String, default: 'pt-BR' } })
const { t } = useI18n()
const { theme: chartTheme } = useChartTheme()
const narrowLayout = shallowRef(false)
function updateLayout() { narrowLayout.value = window.innerWidth < 640 }
onMounted(() => { updateLayout(); window.addEventListener('resize', updateLayout) })
onUnmounted(() => window.removeEventListener('resize', updateLayout))
const label = (interval) => interval.from === interval.to ? formatDashboardDate(interval.from, props.locale) : `${formatDashboardDate(interval.from, props.locale)} – ${formatDashboardDate(interval.to, props.locale)}`
const series = computed(() => [
  { name: t('reports.income'), data: props.intervals.map((row) => row.realized_income.amount_centavos / 100) },
  { name: t('reports.expenses'), data: props.intervals.map((row) => row.realized_expenses.amount_centavos / 100) },
])
const options = computed(() => ({ xaxis: { categories: props.intervals.map(label) }, colors: [chartTheme.value.income, chartTheme.value.expense], dataLabels: { enabled: false } }))
</script>

<template>
  <section class="report-card" aria-labelledby="report-evolution-heading" data-test="report-evolution">
    <h2 id="report-evolution-heading">{{ t('reports.evolution') }}</h2>
    <p v-if="!intervals.length">{{ t('reports.noActivity') }}</p>
    <template v-else>
      <BaseChart :key="narrowLayout ? 'narrow' : 'wide'" type="line" :series="series" :options="options" :theme="chartTheme" :label="t('reports.evolution')" :height="260" />
      <div class="table-scroll"><table>
        <caption>{{ t('reports.evolution') }} · {{ t(`reports.granularity.${granularity}`) }}</caption>
        <thead><tr><th scope="col">{{ t('reports.interval') }}</th><th scope="col">{{ t('reports.income') }}</th><th scope="col">{{ t('reports.expenses') }}</th><th scope="col">{{ t('reports.result') }}</th></tr></thead>
        <tbody><tr v-for="row in intervals" :key="row.from"><th scope="row">{{ label(row) }}<span v-if="row.is_partial"> · {{ t('reports.partial') }}</span></th><td>{{ formatDashboardCurrency(row.realized_income.amount_centavos, { locale }) }}</td><td>{{ formatDashboardCurrency(row.realized_expenses.amount_centavos, { locale }) }}</td><td>{{ formatDashboardCurrency(row.financial_result.amount_centavos, { locale }) }}</td></tr></tbody>
      </table></div>
    </template>
  </section>
</template>

<style scoped>
.report-card { display: grid; gap: 16px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); min-width: 0; }
h2, p { margin: 0; } h2 { font-size: 20px; } p { color: var(--color-text-muted); }
.report-card :deep(.apexcharts-canvas) { max-width: 100%; overflow: hidden; }
.table-scroll { overflow-x: auto; } table { border-collapse: collapse; width: 100%; min-width: 600px; font-variant-numeric: tabular-nums; } caption { text-align: left; font-size: 14px; color: var(--color-text-muted); } th, td { padding: 8px; border-bottom: 1px solid var(--color-border); text-align: right; } th:first-child { text-align: left; }
</style>
