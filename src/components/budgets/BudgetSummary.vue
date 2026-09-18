<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import { excessLabel, formatBRL, formatPercent, statusLabel } from '@/utils/budgets/budgetFormatters'

const props = defineProps({
  summary: { type: Object, required: true },
})

const { t } = useI18n()
const { activeLocale } = useLocale()

const utilization = computed(() => props.summary.overall_utilization_percent)
const hasProgress = computed(() => utilization.value !== null && utilization.value !== undefined)
const progressValue = computed(() => Math.min(100, Math.max(0, Number(utilization.value ?? 0))))
const statusText = computed(() => statusLabel(props.summary.overall_status, t, t('budgets.notApplicable')))
const excessText = computed(() =>
  excessLabel(-props.summary.actual_available.amount_centavos, activeLocale.value, t),
)
const projection = computed(() => props.summary.projected_spending)
const projectionStatus = computed(() =>
  statusLabel(props.summary.projected_status, t, t('budgets.notApplicable')),
)
</script>

<template>
  <section class="budget-summary" aria-labelledby="budget-summary-title">
    <h2 id="budget-summary-title" class="budget-summary-title">{{ t('budgets.summary.title') }}</h2>
    <dl class="budget-summary-values">
      <div>
        <dt>{{ t('budgets.summary.planned') }}</dt>
        <dd data-test="budget-summary-planned">
          {{ formatBRL(props.summary.total_planned.amount_centavos, activeLocale) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('budgets.summary.realized') }}</dt>
        <dd data-test="budget-summary-realized">
          {{ formatBRL(props.summary.budgeted_realized.amount_centavos, activeLocale) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('budgets.summary.available') }}</dt>
        <dd data-test="budget-summary-available">
          {{ formatBRL(props.summary.actual_available.amount_centavos, activeLocale) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('budgets.summary.status') }}</dt>
        <dd data-test="budget-summary-status">{{ statusText }}</dd>
      </div>
    </dl>

    <p class="budget-summary-status" data-test="budget-summary-utilization">
      {{ t('budgets.summary.utilization', { percent: formatPercent(utilization, activeLocale, t('budgets.notApplicable')) }) }}
      — {{ statusText }}
    </p>
    <p v-if="excessText" class="budget-summary-excess" data-test="budget-summary-excess">
      {{ excessText }}
    </p>

    <div
      v-if="hasProgress"
      class="budget-progress"
      role="progressbar"
      :aria-valuenow="utilization"
      aria-valuemin="0"
      :aria-label="t('budgets.summary.progressLabel')"
    >
      <div class="budget-progress-bar" :style="{ width: `${progressValue}%` }" />
    </div>

    <dl class="budget-summary-totals">
      <div>
        <dt>{{ t('budgets.summary.unbudgeted') }}</dt>
        <dd data-test="budget-summary-unbudgeted">
          {{ formatBRL(props.summary.unbudgeted_expenses.amount_centavos, activeLocale) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('budgets.summary.totalExpenses') }}</dt>
        <dd data-test="budget-summary-total-expenses">
          {{ formatBRL(props.summary.total_expenses.amount_centavos, activeLocale) }}
        </dd>
      </div>
    </dl>

    <div v-if="projection" class="budget-summary-projection" data-test="budget-summary-projection">
      <h3>{{ t('budgets.summary.projectionTitle') }}</h3>
      <p>{{ t('budgets.summary.expected') }}: {{ formatBRL(props.summary.expected.amount_centavos, activeLocale) }}</p>
      <p>{{ t('budgets.projected', { amount: formatBRL(projection.amount_centavos, activeLocale) }) }}</p>
      <p>
        {{ t('budgets.summary.projectedAvailable') }}:
        {{ formatBRL(props.summary.projected_available.amount_centavos, activeLocale) }}
        — {{ projectionStatus }}
      </p>
      <p class="budget-projection-note">{{ t('budgets.summary.projectionNote') }}</p>
    </div>
  </section>
</template>

<style scoped>
.budget-summary-values,
.budget-summary-totals {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  margin: 0 0 12px;
}

.budget-summary-values dt,
.budget-summary-totals dt {
  color: var(--el-text-color-secondary);
  font-size: 0.875rem;
}

.budget-summary-values dd,
.budget-summary-totals dd {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.budget-progress {
  background: var(--el-fill-color);
  block-size: 10px;
  border-radius: 999px;
  overflow: hidden;
}

.budget-progress-bar {
  background: var(--el-color-primary);
  block-size: 100%;
}

.budget-summary-excess {
  color: var(--el-color-danger);
  font-weight: 600;
}

.budget-projection-note {
  color: var(--el-text-color-secondary);
  font-size: 0.875rem;
}
</style>
