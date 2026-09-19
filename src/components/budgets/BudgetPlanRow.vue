<script setup>
import { computed } from 'vue'
import { Delete, Edit } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import BudgetProgressBar from './BudgetProgressBar.vue'
import {
  excessLabel,
  formatBRL,
  formatPercent,
  projectionLabel,
  statusLabel,
  statusTagType,
} from '@/utils/budgets/budgetFormatters'

const props = defineProps({
  plan: { type: Object, required: true },
})
const emit = defineEmits(['edit', 'remove'])
const { t } = useI18n()
const { activeLocale } = useLocale()

const readOnly = computed(() => Boolean(props.plan.is_read_only))
const statusText = computed(() => statusLabel(props.plan.status, t, t('budgets.notApplicable')))
const statusType = computed(() => statusTagType(props.plan.status))
const exceededText = computed(() =>
  excessLabel(props.plan.excess.amount_centavos, activeLocale.value, t),
)
const expectedText = computed(() => projectionLabel(props.plan, activeLocale.value, t))
</script>

<template>
  <li class="budget-plan-row" data-test="budget-plan-row" :class="{ 'is-read-only': readOnly }">
    <header class="budget-plan-header">
      <p class="budget-plan-name" data-test="budget-plan-name">{{ props.plan.category.name }}</p>
      <ElTag v-if="readOnly" size="small" type="info">{{ t('budgets.archivedTag') }}</ElTag>
      <ElTag v-else size="small" :type="statusType" data-test="budget-plan-status">{{
        statusText
      }}</ElTag>
    </header>

    <div class="budget-plan-primary-values">
      <p class="budget-plan-realized" data-test="budget-plan-realized">
        {{ formatBRL(props.plan.realized.amount_centavos, activeLocale) }}
      </p>
      <p>
        {{
          t('budgets.plan.ofPlanned', {
            amount: formatBRL(props.plan.planned.amount_centavos, activeLocale),
          })
        }}
      </p>
    </div>

    <BudgetProgressBar
      :value="props.plan.utilization_percent"
      :label="t('budgets.plan.utilization')"
      :value-text="
        formatPercent(props.plan.utilization_percent, activeLocale, t('budgets.notApplicable'))
      "
      :status="props.plan.status"
    />

    <div class="budget-plan-meta">
      <span>{{
        formatPercent(props.plan.utilization_percent, activeLocale, t('budgets.notApplicable'))
      }}</span>
      <span>{{
        t('budgets.availableAmount', {
          amount: formatBRL(props.plan.available.amount_centavos, activeLocale),
        })
      }}</span>
    </div>
    <p v-if="exceededText" class="budget-plan-excess" data-test="budget-plan-excess">
      {{ exceededText }}
    </p>
    <p v-if="expectedText" class="budget-plan-projection" data-test="budget-plan-projection">
      {{ expectedText }}
    </p>

    <div v-if="!readOnly" class="budget-plan-actions">
      <ElButton
        data-test="budget-plan-edit"
        size="small"
        text
        :icon="Edit"
        @click="emit('edit', props.plan)"
      >
        {{ t('budgets.plan.edit') }}
      </ElButton>
      <ElButton
        data-test="budget-plan-remove"
        size="small"
        text
        type="danger"
        :icon="Delete"
        @click="emit('remove', props.plan)"
      >
        {{ t('budgets.plan.remove') }}
      </ElButton>
    </div>
    <p v-else class="budget-plan-readonly-note">{{ t('budgets.plan.archivedNote') }}</p>
  </li>
</template>

<style scoped>
.budget-plan-row {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.budget-plan-header,
.budget-plan-actions,
.budget-plan-meta {
  align-items: center;
  display: flex;
  gap: 12px;
}

.budget-plan-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  margin: 0;
}

.budget-plan-primary-values p,
.budget-plan-excess,
.budget-plan-projection,
.budget-plan-readonly-note {
  margin: 0;
}

.budget-plan-realized {
  color: var(--color-financial-negative);
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  font-variant-numeric: tabular-nums;
}

.budget-plan-primary-values > p:last-child,
.budget-plan-meta,
.budget-plan-projection,
.budget-plan-readonly-note {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.budget-plan-meta {
  justify-content: space-between;
  font-variant-numeric: tabular-nums;
}
.budget-plan-actions {
  gap: 0;
  justify-content: flex-end;
}
.budget-plan-excess {
  color: var(--color-danger);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
.is-read-only {
  background: var(--color-surface-secondary);
}

@media (max-width: 399px) {
  .budget-plan-header {
    align-items: start;
  }
  .budget-plan-meta {
    align-items: start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
