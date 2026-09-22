<script setup>
import { computed } from 'vue'
import { ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  formatBRL,
  formatIsoDate,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  statement: { type: Object, required: true },
})

const { t } = useI18n()
const status = computed(() => statementStatus(props.statement.status))
const outstandingCentavos = computed(() => props.statement.outstanding_amount?.amount_centavos ?? 0)
</script>

<template>
  <section class="statement-summary" data-test="credit-card-statement-summary" aria-labelledby="statement-summary-title">
    <header class="statement-summary-header">
      <div>
        <h2 id="statement-summary-title">{{ t('creditCards.statementDetail.currentOutstanding') }}</h2>
        <p>{{ t('creditCards.statementDetail.dueOn', { date: formatIsoDate(props.statement.due_date) }) }}</p>
      </div>
      <ElTag :type="status.tone" data-test="credit-card-statement-status">
        {{ t(status.labelKey) }}
      </ElTag>
    </header>

    <strong class="statement-summary-amount" data-test="credit-card-statement-outstanding">
      {{ formatBRL(outstandingCentavos) }}
    </strong>

    <dl class="statement-summary-meta">
      <div>
        <dt>{{ t('creditCards.statementDetail.billingPeriod') }}</dt>
        <dd>
          {{ formatIsoDate(props.statement.period_from) }} –
          {{ formatIsoDate(props.statement.period_to) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('creditCards.statement.closing') }}</dt>
        <dd>{{ formatIsoDate(props.statement.closing_date) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.statement-summary {
  display: grid;
  gap: 20px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.statement-summary-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.statement-summary-header h2,
.statement-summary-header p,
.statement-summary-amount,
.statement-summary-meta dt,
.statement-summary-meta dd {
  margin: 0;
}

.statement-summary-header h2 {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.statement-summary-header p,
.statement-summary-meta dt {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.statement-summary-header p {
  margin-top: 4px;
}

.statement-summary-amount {
  color: var(--color-text);
  font-size: clamp(32px, 5vw, 40px);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
}

.statement-summary-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.statement-summary-meta > div {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
}

.statement-summary-meta dd {
  color: var(--color-text);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 20px;
}

@media (max-width: 479px) {
  .statement-summary-meta {
    grid-template-columns: 1fr;
  }
}
</style>
