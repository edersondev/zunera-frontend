<script setup>
import { computed } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatMonth, shiftMonth } from '@/utils/common/monthFormatters'

const props = defineProps({
  month: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['change-month'])
const { t, locale } = useI18n()

const label = computed(() => formatMonth(props.month.year, props.month.month, locale.value))

function shift(offset) {
  emit('change-month', shiftMonth(props.month, offset))
}
</script>

<template>
  <div class="month-navigator">
    <ElButton
      data-test="month-previous"
      :disabled="props.loading"
      :aria-label="t('common.month.previous')"
      @click="shift(-1)"
    >
      <ElIcon><ArrowLeft /></ElIcon>
    </ElButton>
    <p class="month-navigator-label" data-test="month-label" aria-live="polite">{{ label }}</p>
    <ElButton
      data-test="month-next"
      :disabled="props.loading"
      :aria-label="t('common.month.next')"
      @click="shift(1)"
    >
      <ElIcon><ArrowRight /></ElIcon>
    </ElButton>
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

.month-navigator-label {
  min-width: 12rem;
  margin: 0;
  color: var(--color-text);
  font-weight: 600;
  text-align: center;
  text-transform: capitalize;
}

@media (max-width: 639px) {
  /* Grid keeps the label readable when a hosting header stretches buttons to
     full width on narrow screens. */
  .month-navigator {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
  }

  .month-navigator-label {
    min-width: 0;
    font-size: 14px;
  }
}
</style>
