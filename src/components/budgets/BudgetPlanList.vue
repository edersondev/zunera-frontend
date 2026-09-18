<script setup>
import { useI18n } from 'vue-i18n'
import BudgetPlanRow from './BudgetPlanRow.vue'

const props = defineProps({
  plans: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['add', 'edit', 'remove'])
const { t } = useI18n()
</script>

<template>
  <section class="budget-plan-list" aria-labelledby="budget-plan-list-title">
    <div class="budget-plan-list-header">
      <h2 id="budget-plan-list-title">{{ t('budgets.planList.title') }}</h2>
      <ElButton data-test="budget-plan-add" type="primary" :disabled="props.loading" @click="emit('add')">
        {{ t('budgets.planList.add') }}
      </ElButton>
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
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
