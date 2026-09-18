<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import {
  excessLabel,
  formatBRL,
  formatPercent,
  projectionLabel,
  statusLabel,
} from '@/utils/budgets/budgetFormatters'

const props = defineProps({
  plan: { type: Object, required: true },
})
const emit = defineEmits(['edit', 'remove'])
const { t } = useI18n()
const { activeLocale } = useLocale()

const readOnly = computed(() => Boolean(props.plan.is_read_only))
const statusText = computed(() => statusLabel(props.plan.status, t, t('budgets.notApplicable')))
const exceededText = computed(() => excessLabel(props.plan.excess.amount_centavos, activeLocale.value, t))
const expectedText = computed(() => projectionLabel(props.plan, activeLocale.value, t))
</script>

<template>
  <li class="budget-plan-row" data-test="budget-plan-row" :class="{ 'is-read-only': readOnly }">
    <div class="budget-plan-identity">
      <p class="budget-plan-name" data-test="budget-plan-name">{{ props.plan.category.name }}</p>
      <ElTag v-if="readOnly" size="small" type="info">{{ t('budgets.archivedTag') }}</ElTag>
    </div>

    <dl class="budget-plan-values">
      <div>
        <dt>{{ t('budgets.plan.planned') }}</dt>
        <dd>{{ formatBRL(props.plan.planned.amount_centavos, activeLocale) }}</dd>
      </div>
      <div>
        <dt>{{ t('budgets.plan.realized') }}</dt>
        <dd data-test="budget-plan-realized">
          {{ formatBRL(props.plan.realized.amount_centavos, activeLocale) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('budgets.plan.available') }}</dt>
        <dd>{{ formatBRL(props.plan.available.amount_centavos, activeLocale) }}</dd>
      </div>
      <div>
        <dt>{{ t('budgets.plan.utilization') }}</dt>
        <dd>{{ formatPercent(props.plan.utilization_percent, activeLocale, t('budgets.notApplicable')) }}</dd>
      </div>
      <div>
        <dt>{{ t('budgets.plan.status') }}</dt>
        <dd data-test="budget-plan-status">{{ statusText }}</dd>
      </div>
    </dl>

    <p v-if="exceededText" class="budget-plan-excess" data-test="budget-plan-excess">
      {{ exceededText }}
    </p>
    <p v-if="expectedText" class="budget-plan-projection" data-test="budget-plan-projection">
      {{ expectedText }}
    </p>

    <div v-if="!readOnly" class="budget-plan-actions">
      <ElButton data-test="budget-plan-edit" size="small" @click="emit('edit', props.plan)">
        {{ t('budgets.plan.edit') }}
      </ElButton>
      <ElButton
        data-test="budget-plan-remove"
        size="small"
        type="danger"
        plain
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
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: grid;
  gap: 8px;
  padding: 16px 0;
}

.budget-plan-identity {
  align-items: center;
  display: flex;
  gap: 8px;
}

.budget-plan-name {
  font-weight: 600;
  margin: 0;
}

.budget-plan-values {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  margin: 0;
}

.budget-plan-values dt {
  color: var(--el-text-color-secondary);
  font-size: 0.8125rem;
}

.budget-plan-values dd {
  margin: 0;
  font-weight: 600;
}

.budget-plan-excess {
  color: var(--el-color-danger);
  font-weight: 600;
  margin: 0;
}

.budget-plan-projection,
.budget-plan-readonly-note {
  color: var(--el-text-color-secondary);
  margin: 0;
}
</style>
