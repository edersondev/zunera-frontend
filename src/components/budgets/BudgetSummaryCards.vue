<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import { formatBRL, statusLabel, statusTagType } from '@/utils/budgets/budgetFormatters'

const props = defineProps({
  summary: { type: Object, required: true },
})

const { t } = useI18n()
const { activeLocale } = useLocale()
const statusText = computed(() =>
  statusLabel(props.summary.overall_status, t, t('budgets.notApplicable')),
)
const statusType = computed(() => statusTagType(props.summary.overall_status))
const hasNegativeAvailability = computed(() => props.summary.actual_available.amount_centavos < 0)
</script>

<template>
  <section class="budget-summary-cards" :aria-label="t('budgets.summary.title')">
    <article class="summary-card">
      <h2 class="card-label">{{ t('budgets.summary.planned') }}</h2>
      <p class="card-value" data-test="budget-summary-planned">
        {{ formatBRL(props.summary.total_planned.amount_centavos, activeLocale) }}
      </p>
    </article>
    <article class="summary-card">
      <h2 class="card-label">{{ t('budgets.summary.realized') }}</h2>
      <p class="card-value financial-negative" data-test="budget-summary-realized">
        {{ formatBRL(props.summary.budgeted_realized.amount_centavos, activeLocale) }}
      </p>
    </article>
    <article class="summary-card">
      <h2 class="card-label">{{ t('budgets.summary.available') }}</h2>
      <p
        class="card-value"
        :class="{ 'financial-negative': hasNegativeAvailability }"
        data-test="budget-summary-available"
      >
        {{ formatBRL(props.summary.actual_available.amount_centavos, activeLocale) }}
      </p>
    </article>
    <article class="summary-card">
      <h2 class="card-label">{{ t('budgets.summary.status') }}</h2>
      <ElTag :type="statusType" effect="light" data-test="budget-summary-status">{{
        statusText
      }}</ElTag>
    </article>
  </section>
</template>

<style scoped>
.budget-summary-cards {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);
}

.summary-card {
  display: grid;
  align-content: start;
  gap: 8px;
  min-block-size: 128px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.card-label {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.card-value {
  margin: 0;
  color: var(--color-text);
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  font-variant-numeric: tabular-nums;
}

.financial-negative {
  color: var(--color-financial-negative);
}

@media (min-width: 640px) {
  .budget-summary-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .budget-summary-cards {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
