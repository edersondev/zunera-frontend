<script setup>
import { computed } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatBudgetMonth, shiftMonth } from '@/utils/budgets/budgetFormatters'

const props = defineProps({
  month: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  previousLabel: { type: String, required: true },
  nextLabel: { type: String, required: true },
  testPrefix: { type: String, required: true },
})
const emit = defineEmits(['change-month'])
const { locale } = useI18n()
const label = computed(() => formatBudgetMonth(props.month.year, props.month.month, locale.value))

function shift(offset) {
  emit('change-month', shiftMonth(props.month, offset))
}
</script>

<template>
  <div class="month-navigator">
    <ElButton
      :data-test="`${testPrefix}-previous`"
      :disabled="loading"
      :aria-label="previousLabel"
      @click="shift(-1)"
    ><ElIcon><ArrowLeft /></ElIcon></ElButton>
    <p class="month-label" :data-test="`${testPrefix}-label`" aria-live="polite">{{ label }}</p>
    <ElButton
      :data-test="`${testPrefix}-next`"
      :disabled="loading"
      :aria-label="nextLabel"
      @click="shift(1)"
    ><ElIcon><ArrowRight /></ElIcon></ElButton>
  </div>
</template>

<style scoped>
.month-navigator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.month-label {
  min-width: 12rem;
  margin: 0;
  color: var(--color-text);
  font-weight: 600;
  text-align: center;
  text-transform: capitalize;
}
@media (max-width: 639px) {
  .month-label { min-width: 8rem; flex: 1; }
}
</style>
