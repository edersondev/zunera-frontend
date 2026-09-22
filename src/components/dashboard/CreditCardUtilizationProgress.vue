<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatBRL, formatCreditUtilization } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  usedCentavos: { type: Number, default: 0 },
  limitCentavos: { type: Number, default: 0 },
  availableCentavos: { type: Number, default: 0 },
  locale: { type: String, default: 'pt-BR' },
  label: { type: String, required: true },
  isOverLimit: { type: Boolean, default: false },
})

const { t } = useI18n()

const utilization = computed(() =>
  formatCreditUtilization(props.usedCentavos, props.limitCentavos, props.locale),
)
const progressClass = computed(() => (props.isOverLimit ? 'is-over-limit' : ''))
const valueText = computed(() => {
  if (!utilization.value.isAvailable) return t('creditCards.dashboard.utilizationUnavailable')

  return t('creditCards.dashboard.utilizationValue', {
    used: formatBRL(props.usedCentavos, props.locale),
    limit: formatBRL(props.limitCentavos, props.locale),
    percent: utilization.value.formatted,
  })
})
</script>

<template>
  <section class="credit-utilization" :class="progressClass">
    <div class="credit-utilization-header">
      <p class="credit-utilization-label">{{ props.label }}</p>
      <span
        v-if="utilization.isAvailable"
        class="credit-utilization-value"
        data-test="credit-utilization-percent"
      >
        {{ utilization.formatted }}
      </span>
    </div>

    <template v-if="utilization.isAvailable">
      <p class="credit-utilization-copy">
        {{
          t('creditCards.dashboard.usedOfLimit', {
            used: formatBRL(props.usedCentavos, props.locale),
            limit: formatBRL(props.limitCentavos, props.locale),
          })
        }}
      </p>
      <div
        class="credit-utilization-track"
        role="progressbar"
        :aria-label="props.label"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="utilization.visualPercent"
        :aria-valuetext="valueText"
        data-test="credit-utilization-progress"
      >
        <span class="credit-utilization-fill" :style="{ width: `${utilization.visualPercent}%` }" />
      </div>
      <p class="credit-utilization-available">
        {{
          t('creditCards.dashboard.availableCredit', {
            amount: formatBRL(props.availableCentavos, props.locale),
          })
        }}
      </p>
    </template>

    <p v-else class="credit-utilization-unavailable" data-test="credit-utilization-unavailable">
      {{ t('creditCards.dashboard.utilizationUnavailable') }}
    </p>
  </section>
</template>

<style scoped>
.credit-utilization {
  display: grid;
  gap: 8px;
}

.credit-utilization-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.credit-utilization-label,
.credit-utilization-copy,
.credit-utilization-available,
.credit-utilization-unavailable {
  margin: 0;
}

.credit-utilization-label {
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.credit-utilization-value {
  color: var(--color-text);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 20px;
}

.credit-utilization-copy,
.credit-utilization-available,
.credit-utilization-unavailable {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}

.credit-utilization-track {
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-surface-tertiary);
}

.credit-utilization-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-action-primary);
}

.is-over-limit .credit-utilization-fill {
  background: var(--color-danger);
}
</style>
