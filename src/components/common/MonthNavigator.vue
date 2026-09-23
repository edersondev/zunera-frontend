<script setup>
import { computed } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatMonth, shiftMonth } from '@/utils/common/monthFormatters'

const props = defineProps({
  month: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  previousLabel: { type: String, default: '' },
  nextLabel: { type: String, default: '' },
  testPrefix: { type: String, default: 'month' },
})
const emit = defineEmits(['change-month'])
const { t, locale } = useI18n()

const label = computed(() => formatMonth(props.month.year, props.month.month, locale.value))

function shift(offset) {
  emit('change-month', shiftMonth(props.month, offset))
}
</script>

<template>
  <div
    class="flex items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 max-sm:grid max-sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:gap-2"
  >
    <ElButton
      :data-test="`${testPrefix}-previous`"
      :disabled="props.loading"
      :aria-label="previousLabel || t('common.month.previous')"
      @click="shift(-1)"
    >
      <ElIcon><ArrowLeft /></ElIcon>
    </ElButton>
    <p
      class="m-0 min-w-48 text-center font-semibold text-[var(--color-text)] capitalize max-sm:min-w-0 max-sm:text-sm"
      :data-test="`${testPrefix}-label`"
      aria-live="polite"
    >
      {{ label }}
    </p>
    <ElButton
      :data-test="`${testPrefix}-next`"
      :disabled="props.loading"
      :aria-label="nextLabel || t('common.month.next')"
      @click="shift(1)"
    >
      <ElIcon><ArrowRight /></ElIcon>
    </ElButton>
  </div>
</template>
