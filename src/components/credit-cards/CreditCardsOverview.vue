<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  availableCreditPresentation,
  formatBRL,
  sumCreditCardCurrentStatementOutstanding,
  sumCreditCardSummaryAmount,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  locale: { type: String, default: 'pt-BR' },
})

const { t } = useI18n()
const limitCentavos = computed(() => sumCreditCardSummaryAmount(props.cards, 'credit_limit'))
const usedCentavos = computed(() => sumCreditCardSummaryAmount(props.cards, 'used_credit'))
const availableCentavos = computed(() => sumCreditCardSummaryAmount(props.cards, 'available_credit'))
const outstandingCentavos = computed(() => sumCreditCardCurrentStatementOutstanding(props.cards))
const available = computed(() => availableCreditPresentation(availableCentavos.value, props.locale))
const metrics = computed(() => [
  { key: 'limit', label: t('creditCards.management.totalLimit'), amount: limitCentavos.value, tone: 'neutral' },
  { key: 'used', label: t('creditCards.management.totalUsed'), amount: usedCentavos.value, tone: 'used' },
  {
    key: 'available',
    label: t('creditCards.management.totalAvailable'),
    amount: availableCentavos.value,
    tone: available.value.isOverLimit ? 'danger' : 'available',
  },
  {
    key: 'outstanding',
    label: t('creditCards.management.outstandingObligation'),
    amount: outstandingCentavos.value,
    tone: 'neutral',
  },
])
</script>

<template>
  <section class="credit-cards-overview" data-test="credit-cards-overview" aria-labelledby="credit-cards-overview-title">
    <header class="overview-header">
      <h2 id="credit-cards-overview-title">{{ t('creditCards.management.overview') }}</h2>
      <p>{{ t('creditCards.management.activeCards', { count: props.cards.length }) }}</p>
    </header>
    <dl class="overview-grid">
      <div v-for="metric in metrics" :key="metric.key" class="overview-metric" :class="`is-${metric.tone}`">
        <dt>{{ metric.label }}</dt>
        <dd :data-test="`credit-cards-overview-${metric.key}`">
          {{ formatBRL(metric.amount, props.locale) }}
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.credit-cards-overview {
  display: grid;
  gap: 16px;
}

.overview-header,
.overview-header h2,
.overview-header p,
.overview-grid,
.overview-metric dt,
.overview-metric dd {
  margin: 0;
}

.overview-header {
  display: grid;
  gap: 4px;
}

.overview-header h2 {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.overview-header p,
.overview-metric dt {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 12px;
}

.overview-metric {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.overview-metric dt {
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.overview-metric dd {
  overflow: hidden;
  color: var(--color-text);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 28px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-used dd {
  color: var(--color-warning);
}

.is-available dd {
  color: var(--color-action-primary);
}

.is-danger dd {
  color: var(--color-danger);
}

@media (min-width: 640px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .overview-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
