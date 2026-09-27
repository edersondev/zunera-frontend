<script setup>
import { useI18n } from 'vue-i18n'
import { formatDashboardCurrency, formatDashboardDate, resultDirection } from '@/utils/dashboard/dashboardFormatters'

defineProps({ intervals: { type: Array, required: true }, locale: { type: String, default: 'pt-BR' } })
const { t } = useI18n()
const label = (row, locale) => row.from === row.to ? formatDashboardDate(row.from, locale) : `${formatDashboardDate(row.from, locale)} – ${formatDashboardDate(row.to, locale)}`
</script>

<template>
  <details class="breakdown" data-test="report-detailed-breakdown">
    <summary>{{ t('reports.detailedBreakdown') }} ({{ intervals.length }})</summary>
    <div class="table-scroll"><table>
      <caption>{{ t('reports.detailedBreakdown') }}</caption>
      <thead><tr><th scope="col">{{ t('reports.interval') }}</th><th scope="col">{{ t('reports.income') }}</th><th scope="col">{{ t('reports.expenses') }}</th><th scope="col">{{ t('reports.result') }}</th></tr></thead>
      <tbody><tr v-for="row in intervals" :key="row.from"><th scope="row">{{ label(row, locale) }}<span v-if="row.is_partial"> · {{ t('reports.partial') }}</span></th><td class="report-income-amount">{{ formatDashboardCurrency(row.realized_income.amount_centavos, { locale }) }}</td><td class="report-expense-amount">{{ formatDashboardCurrency(row.realized_expenses.amount_centavos, { locale }) }}</td><td :class="`report-result-${resultDirection(row.financial_result.amount_centavos)}`">{{ formatDashboardCurrency(row.financial_result.amount_centavos, { locale }) }}</td></tr></tbody>
    </table></div>
  </details>
</template>

<style scoped>
.breakdown { min-width: 0; } summary { cursor: pointer; color: var(--color-action-primary); font-weight: 600; } summary:focus-visible { outline: 2px solid var(--color-action-primary); outline-offset: 3px; } .table-scroll { overflow-x: auto; padding-top: 12px; } table { border-collapse: collapse; min-width: 600px; width: 100%; font-variant-numeric: tabular-nums; } caption { text-align: left; color: var(--color-text-muted); font-size: 14px; } th, td { padding: 8px; border-bottom: 1px solid var(--color-border); text-align: right; } th:first-child { text-align: left; }
</style>
