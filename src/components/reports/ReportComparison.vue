<script setup>
import { useI18n } from 'vue-i18n'
import { formatDashboardCurrency, formatDashboardPercent, formatDashboardPeriod, resultDirection } from '@/utils/dashboard/dashboardFormatters'

defineProps({ comparison: { type: Object, required: true }, scope: { type: Object, required: true }, locale: { type: String, default: 'pt-BR' } })
const emit = defineEmits(['detail'])
const { t } = useI18n()
const fields = ['realized_income', 'realized_expenses', 'financial_result']
const labels = { realized_income: 'income', realized_expenses: 'expenses', financial_result: 'result' }
function metricClass(field, amount) {
  if (field === 'realized_income') return 'report-income-amount'
  if (field === 'realized_expenses') return 'report-expense-amount'
  return `report-result-${resultDirection(amount)}`
}
</script>

<template>
  <section class="report-card" aria-labelledby="report-comparison-heading" data-test="report-comparison">
    <h2 id="report-comparison-heading">{{ t('reports.comparison') }}</h2>
    <p class="periods">{{ t('reports.current') }}: {{ formatDashboardPeriod(scope.current_period, locale) }} · {{ t('reports.days', { count: scope.current_period.day_count }) }}<br>{{ t('reports.previous') }}: {{ formatDashboardPeriod(scope.previous_period, locale) }} · {{ t('reports.days', { count: scope.previous_period.day_count }) }}</p>
    <div class="table-scroll"><table>
      <thead><tr><th scope="col">{{ t('reports.comparison') }}</th><th scope="col">{{ t('reports.current') }}</th><th scope="col">{{ t('reports.previous') }}</th><th scope="col">{{ t('reports.difference') }}</th><th scope="col">{{ t('reports.percentChange') }}</th></tr></thead>
      <tbody>
        <tr v-for="field in fields" :key="field"><th scope="row">{{ t(`reports.${labels[field]}`) }}</th><td><ElButton link type="primary" :class="metricClass(field, comparison[field].current.amount_centavos)" @click="emit('detail', { metric: field, label: t(`reports.${labels[field]}`), which_period: 'current' })">{{ formatDashboardCurrency(comparison[field].current.amount_centavos, { locale }) }}</ElButton></td><td><ElButton link type="primary" :class="metricClass(field, comparison[field].previous.amount_centavos)" @click="emit('detail', { metric: field, label: t(`reports.${labels[field]}`), which_period: 'previous' })">{{ formatDashboardCurrency(comparison[field].previous.amount_centavos, { locale }) }}</ElButton></td><td :class="metricClass(field, comparison[field].difference.amount_centavos)">{{ formatDashboardCurrency(comparison[field].difference.amount_centavos, { locale }) }}</td><td><span v-if="comparison[field].percent_change !== null">{{ formatDashboardPercent(comparison[field].percent_change, locale) }}</span><span v-else>{{ t('reports.percentUnavailable') }}</span></td></tr>
      </tbody>
    </table></div>
    <p v-if="fields.some((field) => comparison[field].percent_change === null) || comparison.expense_categories.some((row) => row.amounts.percent_change === null)" class="percent-note">{{ t('reports.percentUnavailableNote') }}</p>
    <details class="category-comparison" data-test="report-category-comparison"><summary>{{ t('reports.categoryChanges') }} ({{ comparison.expense_categories.length }})</summary>
      <p v-if="!comparison.expense_categories.length">{{ t('reports.emptySection') }}</p>
      <div v-else class="table-scroll"><table><thead><tr><th scope="col">{{ t('reports.categoryChanges') }}</th><th scope="col">{{ t('reports.current') }}</th><th scope="col">{{ t('reports.previous') }}</th><th scope="col">{{ t('reports.difference') }}</th><th scope="col">{{ t('reports.percentChange') }}</th></tr></thead><tbody><tr v-for="row in comparison.expense_categories" :key="row.category.id"><th scope="row">{{ row.category.name }} <small v-if="row.category.status === 'archived'">({{ t('reports.archived') }})</small></th><td><ElButton link type="primary" class="report-expense-amount" :aria-label="`${t('reports.details')}: ${row.category.name}, ${t('reports.current')}`" @click="emit('detail', { metric: 'expense_category', metric_id: row.category.id, label: row.category.name, which_period: 'current' })">{{ formatDashboardCurrency(row.amounts.current.amount_centavos, { locale }) }}</ElButton></td><td><ElButton link type="primary" class="report-expense-amount" :aria-label="`${t('reports.details')}: ${row.category.name}, ${t('reports.previous')}`" @click="emit('detail', { metric: 'expense_category', metric_id: row.category.id, label: row.category.name, which_period: 'previous' })">{{ formatDashboardCurrency(row.amounts.previous.amount_centavos, { locale }) }}</ElButton></td><td class="report-expense-amount">{{ formatDashboardCurrency(row.amounts.difference.amount_centavos, { locale }) }}</td><td><span v-if="row.amounts.percent_change !== null">{{ formatDashboardPercent(row.amounts.percent_change, locale) }}</span><span v-else>{{ t('reports.percentUnavailable') }}</span></td></tr></tbody></table></div>
    </details>
  </section>
</template>

<style scoped>
.report-card { display: grid; gap: 14px; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); min-width: 0; } h2, p { margin: 0; } h2 { font-size: 20px; } .periods, .percent-note { color: var(--color-text-muted); font-size: 13px; } .table-scroll { overflow-x: auto; } table { border-collapse: collapse; min-width: 640px; width: 100%; } th, td { border-bottom: 1px solid var(--color-border); padding: 8px; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; } th:first-child { text-align: left; } .category-comparison summary { cursor: pointer; color: var(--color-action-primary); font-weight: 600; } .category-comparison summary:focus-visible { outline: 2px solid var(--color-action-primary); outline-offset: 3px; }
</style>
