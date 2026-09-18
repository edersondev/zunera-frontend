<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatDashboardCurrency,
  formatDashboardMovementAmount,
  resultDirection,
} from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({
  summary: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Object,
    default: null,
  },
  locale: {
    type: String,
    default: 'pt-BR',
  },
})

const emit = defineEmits(['retry'])
const { t } = useI18n()

const balance = computed(() =>
  formatDashboardCurrency(props.summary?.current_total_balance?.amount_centavos ?? 0, {
    locale: props.locale,
  }),
)
const income = computed(() =>
  formatDashboardMovementAmount(
    props.summary?.realized_income?.amount_centavos ?? 0,
    'income',
    props.locale,
  ),
)
const expenses = computed(() =>
  formatDashboardMovementAmount(
    props.summary?.realized_expenses?.amount_centavos ?? 0,
    'expense',
    props.locale,
  ),
)
const result = computed(() =>
  formatDashboardCurrency(props.summary?.financial_result?.amount_centavos ?? 0, {
    locale: props.locale,
  }),
)
const resultTone = computed(() =>
  resultDirection(props.summary?.financial_result?.amount_centavos ?? 0),
)
const resultLabel = computed(() => t(`dashboard.summary.result${capitalize(resultTone.value)}`))

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
</script>

<template>
  <section class="summary-cards" aria-labelledby="dashboard-summary-title">
    <h2 id="dashboard-summary-title" class="section-title">{{ t('dashboard.summary.title') }}</h2>

    <ElAlert
      v-if="error"
      class="section-error"
      type="error"
      :closable="false"
      show-icon
      :title="t('dashboard.states.error', { section: t('dashboard.sectionNames.summary') })"
      data-test="dashboard-summary-error"
    >
      <ElButton size="small" data-test="dashboard-summary-retry" @click="emit('retry')">
        {{ t('dashboard.states.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton
      v-else-if="loading && !summary"
      :rows="2"
      animated
      data-test="dashboard-summary-loading"
    />

    <div v-else class="card-grid">
      <article class="summary-card" data-test="dashboard-summary-balance">
        <h3 class="card-label">{{ t('dashboard.summary.currentBalance') }}</h3>
        <p class="card-value" data-test="dashboard-summary-balance-value">{{ balance }}</p>
        <p class="card-hint">{{ t('dashboard.summary.currentBalanceHint') }}</p>
      </article>

      <article class="summary-card" data-test="dashboard-summary-income">
        <h3 class="card-label">{{ t('dashboard.summary.income') }}</h3>
        <p class="card-value financial-positive" data-test="dashboard-summary-income-value">
          {{ income }}
        </p>
      </article>

      <article class="summary-card" data-test="dashboard-summary-expenses">
        <h3 class="card-label">{{ t('dashboard.summary.expenses') }}</h3>
        <p class="card-value financial-negative" data-test="dashboard-summary-expenses-value">
          {{ expenses }}
        </p>
      </article>

      <article class="summary-card" data-test="dashboard-summary-result">
        <h3 class="card-label">{{ t('dashboard.summary.result') }}</h3>
        <p
          class="card-value"
          :class="`result-${resultTone}`"
          data-test="dashboard-summary-result-value"
        >
          {{ result }}
        </p>
        <p class="card-hint" data-test="dashboard-summary-result-cue">{{ resultLabel }}</p>
      </article>
    </div>

    <p v-if="!error" class="transfer-note">{{ t('dashboard.summary.transferNote') }}</p>
  </section>
</template>

<style scoped>
.summary-cards {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.section-title {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}

.card-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.summary-card {
  display: grid;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
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

.financial-positive,
.result-positive {
  color: var(--color-financial-positive);
}

.financial-negative,
.result-negative {
  color: var(--color-financial-negative);
}

.card-hint,
.transfer-note {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}

.section-error :deep(.el-alert__content) {
  display: grid;
  gap: 8px;
}

@media (min-width: 640px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
