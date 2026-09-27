<script setup>
import { useI18n } from 'vue-i18n'
import { formatDashboardCurrency, resultDirection } from '@/utils/dashboard/dashboardFormatters'

defineProps({ summary: { type: Object, required: true }, locale: { type: String, default: 'pt-BR' } })
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
        <p class="amount">{{ formatDashboardCurrency(summary[field.key].amount_centavos, { locale }) }}</p>
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
.report-card { display: grid; gap: 16px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); min-width: 0; }
h2, h3, p { margin: 0; }
h2 { font-size: 20px; }
h3, .hint, .cue { font-size: 14px; color: var(--color-text-muted); }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 12px; }
.summary-item { display: grid; gap: 6px; padding: 16px; background: var(--color-surface-secondary); border-radius: var(--radius-md); min-width: 0; }
.amount { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.summary-item :deep(.el-button) { justify-self: start; }
</style>
