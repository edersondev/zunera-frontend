<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: null },
  label: { type: String, required: true },
  valueText: { type: String, required: true },
  status: { type: String, default: 'not_applicable' },
})

const hasValue = computed(() => props.value !== null && props.value !== undefined)
const normalizedValue = computed(() => Math.max(0, Math.min(100, Number(props.value ?? 0))))
const toneClass = computed(() => `is-${props.status}`)
</script>

<template>
  <div
    v-if="hasValue"
    class="budget-progress"
    :class="toneClass"
    role="progressbar"
    :aria-label="props.label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="normalizedValue"
    :aria-valuetext="props.valueText"
  >
    <div class="budget-progress-bar" :style="{ width: `${normalizedValue}%` }" />
  </div>
</template>

<style scoped>
.budget-progress {
  block-size: 10px;
  overflow: hidden;
  border-radius: var(--radius-full, 9999px);
  background: var(--color-surface-tertiary);
}

.budget-progress-bar {
  block-size: 100%;
  border-radius: inherit;
  background: var(--color-action-primary);
}

.is-approaching .budget-progress-bar,
.is-reached .budget-progress-bar {
  background: var(--color-warning);
}

.is-exceeded .budget-progress-bar {
  background: var(--color-danger);
}
</style>
