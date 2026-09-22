<script setup>
import { useI18n } from 'vue-i18n'
import { formatBRL, formatIsoDate } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  statement: { type: Object, required: true },
})

const { t } = useI18n()
</script>

<template>
  <div class="statement-information-grid">
    <section class="statement-breakdown" data-test="credit-card-statement-totals" aria-labelledby="statement-breakdown-title">
      <h2 id="statement-breakdown-title">{{ t('creditCards.statementDetail.breakdown') }}</h2>
      <dl>
        <div class="breakdown-row">
          <dt>{{ t('creditCards.statement.original') }}</dt>
          <dd>{{ formatBRL(props.statement.original_amount?.amount_centavos) }}</dd>
        </div>
        <div class="breakdown-row credit-row">
          <dt>{{ t('creditCards.statement.creditAdjustments') }}</dt>
          <dd>−{{ formatBRL(props.statement.credit_adjustments?.amount_centavos) }}</dd>
        </div>
        <div class="breakdown-row net-row">
          <dt>{{ t('creditCards.statement.net') }}</dt>
          <dd>{{ formatBRL(props.statement.net_amount?.amount_centavos) }}</dd>
        </div>
        <div class="breakdown-row payment-row">
          <dt>{{ t('creditCards.statement.paid') }}</dt>
          <dd>−{{ formatBRL(props.statement.paid_amount?.amount_centavos) }}</dd>
        </div>
        <div class="breakdown-row outstanding-row">
          <dt>{{ t('creditCards.statement.outstanding') }}</dt>
          <dd>{{ formatBRL(props.statement.outstanding_amount?.amount_centavos) }}</dd>
        </div>
      </dl>
    </section>

    <section class="statement-dates" aria-labelledby="statement-dates-title">
      <h2 id="statement-dates-title">{{ t('creditCards.statementDetail.billingDates') }}</h2>
      <dl>
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
        <div class="due-date">
          <dt>{{ t('creditCards.statement.due') }}</dt>
          <dd>{{ formatIsoDate(props.statement.due_date) }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.statement-information-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.65fr);
  gap: 16px;
}

.statement-breakdown,
.statement-dates {
  display: grid;
  gap: 16px;
  padding: 20px 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.statement-breakdown h2,
.statement-dates h2,
.statement-breakdown dl,
.statement-dates dl,
.breakdown-row dt,
.breakdown-row dd,
.statement-dates dt,
.statement-dates dd {
  margin: 0;
}

.statement-breakdown h2,
.statement-dates h2 {
  color: var(--color-text);
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
}

.statement-breakdown dl,
.statement-dates dl {
  display: grid;
  gap: 12px;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
  min-width: 0;
}

.breakdown-row dt,
.statement-dates dt {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.breakdown-row dd,
.statement-dates dd {
  color: var(--color-text);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 20px;
  text-align: right;
}

.credit-row dd,
.payment-row dd {
  color: var(--color-success);
}

.net-row,
.outstanding-row {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.outstanding-row dd {
  font-size: 16px;
  font-weight: 700;
}

.statement-dates > dl > div {
  display: grid;
  gap: 4px;
}

.statement-dates dd {
  text-align: left;
}

.due-date {
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
}

@media (max-width: 767px) {
  .statement-information-grid {
    grid-template-columns: 1fr;
  }
}
</style>
