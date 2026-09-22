<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CreditCardUtilizationProgress from '@/components/dashboard/CreditCardUtilizationProgress.vue'
import {
  availableCreditPresentation,
  formatBRL,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  card: { type: Object, required: true },
  locale: { type: String, default: 'pt-BR' },
})

const { t } = useI18n()
const summary = computed(() => props.card.summary ?? {})
const usedCentavos = computed(() => summary.value.used_credit?.amount_centavos ?? 0)
const limitCentavos = computed(() => summary.value.credit_limit?.amount_centavos ?? 0)
const cardCreditCentavos = computed(() => summary.value.card_credit?.amount_centavos ?? 0)
const availableCentavos = computed(() => summary.value.available_credit?.amount_centavos ?? 0)
const available = computed(() => availableCreditPresentation(availableCentavos.value, props.locale))

const metrics = computed(() => [
  {
    key: 'limit',
    label: t('creditCards.summary.limit'),
    amount: limitCentavos.value,
    tone: 'neutral',
  },
  {
    key: 'used',
    label: t('creditCards.summary.used'),
    amount: usedCentavos.value,
    tone: 'used',
  },
  {
    key: 'card-credit',
    label: t('creditCards.summary.cardCredit'),
    amount: cardCreditCentavos.value,
    tone: 'neutral',
  },
  {
    key: 'available',
    label: t('creditCards.summary.available'),
    amount: availableCentavos.value,
    tone: available.value.isOverLimit ? 'danger' : 'available',
  },
])
</script>

<template>
  <section class="credit-card-overview" aria-labelledby="credit-card-overview-title">
    <h2 id="credit-card-overview-title" class="section-title">
      {{ t('creditCards.detail.overview') }}
    </h2>

    <dl class="metric-grid" data-test="credit-card-detail-summary">
      <div v-for="metric in metrics" :key="metric.key" class="metric-card" :class="`is-${metric.tone}`">
        <dt>{{ metric.label }}</dt>
        <dd
          :data-test="metric.key === 'card-credit' ? 'credit-card-detail-card-credit' : metric.key === 'available' ? 'credit-card-detail-available' : undefined"
        >
          {{ formatBRL(metric.amount, props.locale) }}
        </dd>
      </div>
    </dl>

    <CreditCardUtilizationProgress
      :used-centavos="usedCentavos"
      :limit-centavos="limitCentavos"
      :available-centavos="availableCentavos"
      :locale="props.locale"
      :label="t('creditCards.detail.utilization')"
      :is-over-limit="available.isOverLimit"
    />

    <p v-if="available.isOverLimit" class="over-limit-note" data-test="credit-card-detail-over-limit">
      {{ t('creditCards.overLimit', { amount: available.formatted }) }}
    </p>
  </section>
</template>

<style scoped>
.credit-card-overview {
  display: grid;
  gap: 16px;
}

.section-title,
.over-limit-note,
.metric-card dt,
.metric-card dd {
  margin: 0;
}

.section-title {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.metric-card {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.metric-card dt {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.metric-card dd {
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

.is-danger dd,
.over-limit-note {
  color: var(--color-danger);
}

.over-limit-note {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

@media (min-width: 640px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .metric-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
