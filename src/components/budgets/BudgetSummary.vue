<script setup>
import { computed } from 'vue'
import BudgetProjectionCard from './BudgetProjectionCard.vue'
import BudgetSummaryCards from './BudgetSummaryCards.vue'
import BudgetUtilizationCard from './BudgetUtilizationCard.vue'

const props = defineProps({ summary: { type: Object, required: true } })
const hasProjection = computed(
  () => props.summary.projected_spending !== null && props.summary.projected_spending !== undefined,
)
</script>

<template>
  <section class="budget-summary">
    <BudgetSummaryCards :summary="props.summary" />
    <div class="budget-summary-details" :class="{ 'has-projection': hasProjection }">
      <BudgetUtilizationCard :summary="props.summary" />
      <BudgetProjectionCard v-if="hasProjection" :summary="props.summary" />
    </div>
  </section>
</template>

<style scoped>
.budget-summary,
.budget-summary-details {
  display: grid;
  gap: 20px;
}
@media (min-width: 1024px) {
  .budget-summary-details.has-projection {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
