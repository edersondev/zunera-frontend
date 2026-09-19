<script setup>
import { DocumentCopy, Plus } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import BudgetPlanRow from './BudgetPlanRow.vue'

const props = defineProps({
  plans: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['add', 'copy', 'edit', 'remove'])
const { t } = useI18n()
</script>

<template>
  <section class="budget-plan-list" aria-labelledby="budget-plan-list-title">
    <div class="budget-plan-list-header mb-2">
      <h2 id="budget-plan-list-title">{{ t('budgets.planList.title') }}</h2>
      <div class="budget-plan-list-actions">
        <ElButton
          data-test="budget-plan-copy"
          :icon="DocumentCopy"
          :disabled="props.loading"
          @click="emit('copy')"
        >
          {{ t('budgets.copy.action') }}
        </ElButton>
        <ElButton
          data-test="budget-plan-add"
          type="primary"
          :icon="Plus"
          :disabled="props.loading"
          @click="emit('add')"
        >
          {{ t('budgets.planList.add') }}
        </ElButton>
      </div>
    </div>

    <p v-if="props.plans.length === 0" class="budget-plan-list-empty">
      {{ t('budgets.planList.empty') }}
    </p>
    <ul v-else class="budget-plan-list-items">
      <BudgetPlanRow
        v-for="plan in props.plans"
        :key="plan.id"
        :plan="plan"
        @edit="emit('edit', $event)"
        @remove="emit('remove', $event)"
      />
    </ul>
  </section>
</template>

<style scoped>
.budget-plan-list-header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}

.budget-plan-list-items {
  display: grid;
  gap: 16px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.budget-plan-list-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (min-width: 1024px) {
  .budget-plan-list-items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
