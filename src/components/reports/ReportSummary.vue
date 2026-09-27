<script setup>
import { useI18n } from 'vue-i18n'
import { formatDashboardCurrency, resultDirection } from '@/utils/dashboard/dashboardFormatters'

defineProps({ summary: { type: Object, required: true }, comparison: { type: Object, default: null }, locale: { type: String, default: 'pt-BR' } })
const emit = defineEmits(['detail'])
const { t } = useI18n()
const fields = [
  { key: 'realized_income', label: 'income' },
  { key: 'realized_expenses', label: 'expenses' },
  { key: 'financial_result', label: 'result' },
]
</script>

<template>
  <section class="report-card" aria-labelledby="report-summary-heading" data-test="report-summary">
    <h2 id="report-summary-heading">{{ t('reports.summary') }}</h2>
    <div class="summary-grid">
      <article v-for="field in fields" :key="field.key" class="summary-item" :data-test="`report-${field.key}`">
        <h3>{{ t(`reports.${field.label}`) }}</h3>
        <p class="amount" :class="field.key === 'realized_income' ? 'report-income-amount' : field.key === 'realized_expenses' ? 'report-expense-amount' : `report-result-${resultDirection(summary[field.key].amount_centavos)}`">{{ formatDashboardCurrency(summary[field.key].amount_centavos, { locale }) }}</p>
        <p v-if="comparison?.[field.key]?.difference" class="difference">{{ t('reports.difference') }}: <span :class="field.key === 'realized_income' ? 'report-income-amount' : field.key === 'realized_expenses' ? 'report-expense-amount' : `report-result-${resultDirection(comparison[field.key].difference.amount_centavos)}`">{{ formatDashboardCurrency(comparison[field.key].difference.amount_centavos, { locale }) }}</span></p>
        <p v-if="field.key === 'financial_result'" class="cue" data-test="report-result-cue">
          {{ t(`reports.${resultDirection(summary[field.key].amount_centavos)}`) }}
        </p>
        <ElButton link type="primary" :aria-label="`${t('reports.details')}: ${t(`reports.${field.label}`)}`" @click="emit('detail', { metric: field.key, label: t(`reports.${field.label}`) })">{{ t('reports.details') }}</ElButton>
      </article>
    </div>
    <p class="hint">{{ t('reports.transfersExcluded') }}</p>
  </section>
</template>

<style scoped>
.report-card { display: grid; gap: 14px; min-width: 0; }
h2, h3, p { margin: 0; }
h2 { font-size: 20px; }
h3, .hint, .cue { font-size: 14px; color: var(--color-text-muted); }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.summary-item { display: grid; align-content: start; gap: 6px; padding: 18px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); min-width: 0; }
.amount { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.difference { color: var(--color-text-muted); font-size: 13px; font-variant-numeric: tabular-nums; } .hint { font-size: 13px; } @media(max-width: 760px) { .summary-grid { grid-template-columns: 1fr; } }
.summary-item :deep(.el-button) { justify-self: start; }
</style>
