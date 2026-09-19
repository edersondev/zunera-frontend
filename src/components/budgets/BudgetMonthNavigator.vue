<script setup>
import { computed } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatBudgetMonth, shiftMonth } from '@/utils/budgets/budgetFormatters'

const props = defineProps({
  month: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['change-month'])
const { t, locale } = useI18n()

const label = computed(() => formatBudgetMonth(props.month.year, props.month.month, locale.value))

function shift(offset) {
  emit('change-month', shiftMonth(props.month, offset))
}
</script>

<template>
  <div class="budget-month-navigator">
    <ElButton
      data-test="budget-month-previous"
      :disabled="props.loading"
      :aria-label="t('budgets.month.previous')"
      @click="shift(-1)"
    >
      <ElIcon><ArrowLeft /></ElIcon>
    </ElButton>
    <p class="budget-month-label" data-test="budget-month-label" aria-live="polite">{{ label }}</p>
    <ElButton
      data-test="budget-month-next"
      :disabled="props.loading"
      :aria-label="t('budgets.month.next')"
      @click="shift(1)"
    >
      <ElIcon><ArrowRight /></ElIcon>
    </ElButton>
  </div>
</template>

<style scoped>
.budget-month-navigator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.budget-month-label {
  min-width: 12rem;
  margin: 0;
  color: var(--color-text);
  font-weight: 600;
  text-align: center;
  text-transform: capitalize;
}
</style>
