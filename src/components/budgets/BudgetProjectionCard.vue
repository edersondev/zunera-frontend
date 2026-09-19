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
const projectionStatus = computed(() =>
  statusLabel(props.summary.projected_status, t, t('budgets.notApplicable')),
)
const projectionType = computed(() => statusTagType(props.summary.projected_status))
</script>

<template>
  <section
    class="budget-projection-card"
    aria-labelledby="budget-projection-title"
    data-test="budget-summary-projection"
  >
    <div class="card-heading">
      <h2 id="budget-projection-title">{{ t('budgets.summary.projectionTitle') }}</h2>
      <ElTag :type="projectionType" effect="light">{{ projectionStatus }}</ElTag>
    </div>
    <p class="projected-value">
      {{ formatBRL(props.summary.projected_spending.amount_centavos, activeLocale) }}
    </p>
    <dl class="detail-list">
      <div>
        <dt>{{ t('budgets.summary.realized') }}</dt>
        <dd>{{ formatBRL(props.summary.budgeted_realized.amount_centavos, activeLocale) }}</dd>
      </div>
      <div>
        <dt>{{ t('budgets.summary.expected') }}</dt>
        <dd>{{ formatBRL(props.summary.expected.amount_centavos, activeLocale) }}</dd>
      </div>
      <div class="projected-available">
        <dt>{{ t('budgets.summary.projectedAvailable') }}</dt>
        <dd>{{ formatBRL(props.summary.projected_available.amount_centavos, activeLocale) }}</dd>
      </div>
    </dl>
    <p class="projection-note">{{ t('budgets.summary.projectionNote') }}</p>
  </section>
</template>

<style scoped>
.budget-projection-card {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-secondary);
}
.card-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}
.card-heading h2,
.projected-value,
.projection-note {
  margin: 0;
}
.card-heading h2 {
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}
.projected-value {
  color: var(--color-text);
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  font-variant-numeric: tabular-nums;
}
.detail-list {
  display: grid;
  gap: 12px;
  margin: 0;
}
.detail-list > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.detail-list dt,
.projection-note {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}
.detail-list dd {
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}
.projected-available {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}
</style>
