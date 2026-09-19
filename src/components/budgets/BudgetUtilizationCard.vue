<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import BudgetProgressBar from './BudgetProgressBar.vue'
import {
  excessLabel,
  formatBRL,
  formatPercent,
  statusLabel,
  statusTagType,
} from '@/utils/budgets/budgetFormatters'

const props = defineProps({
  summary: { type: Object, required: true },
})

const { t } = useI18n()
const { activeLocale } = useLocale()
const utilization = computed(() => props.summary.overall_utilization_percent)
const utilizationText = computed(() =>
  formatPercent(utilization.value, activeLocale.value, t('budgets.notApplicable')),
)
const statusText = computed(() =>
  statusLabel(props.summary.overall_status, t, t('budgets.notApplicable')),
)
const statusType = computed(() => statusTagType(props.summary.overall_status))
const excessText = computed(() =>
  excessLabel(-props.summary.actual_available.amount_centavos, activeLocale.value, t),
)
</script>

<template>
  <section class="budget-detail-card" aria-labelledby="budget-utilization-title">
    <div class="card-heading">
      <div>
        <h2 id="budget-utilization-title">{{ t('budgets.summary.utilizationTitle') }}</h2>
        <p class="utilization-value" data-test="budget-summary-utilization">
          {{ utilizationText }}
        </p>
      </div>
      <ElTag :type="statusType" effect="light">{{ statusText }}</ElTag>
    </div>

    <BudgetProgressBar
      :value="utilization"
      :label="t('budgets.summary.progressLabel')"
      :value-text="utilizationText"
      :status="props.summary.overall_status"
    />

    <p class="realized-of-planned">
      {{
        t('budgets.summary.realizedOfPlanned', {
          realized: formatBRL(props.summary.budgeted_realized.amount_centavos, activeLocale),
          planned: formatBRL(props.summary.total_planned.amount_centavos, activeLocale),
        })
      }}
    </p>
    <p v-if="excessText" class="excess" data-test="budget-summary-excess">{{ excessText }}</p>

    <dl class="detail-list">
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
  </section>
</template>

<style scoped>
.budget-detail-card {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.card-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.card-heading h2,
.realized-of-planned,
.excess {
  margin: 0;
}

.card-heading h2 {
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}

.utilization-value {
  margin: 4px 0 0;
  color: var(--color-text);
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  font-variant-numeric: tabular-nums;
}

.realized-of-planned,
.detail-list dt {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.excess {
  color: var(--color-danger);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
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

.detail-list dd {
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}
</style>
