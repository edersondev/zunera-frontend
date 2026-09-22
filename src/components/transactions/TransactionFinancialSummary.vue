<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatTransactionAmount } from '@/utils/transactions/transactionFormatters'
import { formatCentavos } from '@/utils/transfers/transferFormatters'

const props = defineProps({
  totals: { type: Object, default: null },
})

const { t } = useI18n()
const income = computed(() =>
  formatTransactionAmount({
    type: 'income',
    amount_centavos: props.totals?.income_centavos ?? 0,
  }),
)
const expenses = computed(() =>
  formatTransactionAmount({
    type: 'expense',
    amount_centavos: props.totals?.expense_centavos ?? 0,
  }),
)
const resultValue = computed(() => props.totals?.financial_result_centavos ?? 0)
const result = computed(() => formatCentavos(resultValue.value))
const resultTone = computed(() => {
  if (resultValue.value > 0) return 'positive'
  if (resultValue.value < 0) return 'negative'

  return 'neutral'
})
</script>

<template>
  <section
    v-if="totals"
    class="financial-summary"
    aria-labelledby="transaction-summary-title"
    data-test="history-totals"
  >
    <h2 id="transaction-summary-title" class="sr-only">
      {{ t('transactions.summary.title') }}
    </h2>
    <dl class="summary-grid">
      <div class="summary-card">
        <dt>{{ t('transactions.summary.income') }}</dt>
        <dd class="financial-positive" data-test="history-total-income">{{ income }}</dd>
      </div>
      <div class="summary-card">
        <dt>{{ t('transactions.summary.expenses') }}</dt>
        <dd class="financial-negative" data-test="history-total-expense">{{ expenses }}</dd>
      </div>
      <div class="summary-card">
        <dt>{{ t('transactions.summary.result') }}</dt>
        <dd :class="`result-${resultTone}`" data-test="history-total-result">
          {{ result }}
        </dd>
      </div>
    </dl>
    <p class="summary-note" data-test="history-total-excludes">
      {{ t('transactions.summary.note') }}
    </p>
  </section>
</template>

<style scoped>
.financial-summary {
  display: grid;
  gap: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin: 0;
}

.summary-card {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.summary-card dt {
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.summary-card dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 32px;
}

.summary-card .financial-positive,
.summary-card .result-positive {
  color: var(--color-financial-positive);
}

.summary-card .financial-negative,
.summary-card .result-negative {
  color: var(--color-financial-negative);
}

.summary-note {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 20px;
}

@media (min-width: 640px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
