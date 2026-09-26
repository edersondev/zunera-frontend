<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatBRL } from '@/utils/financial-accounts/currency'

const props = defineProps({ goal: { type: Object, required: true } })
const { t, locale } = useI18n()
const visual = computed(() => Math.max(0, Math.min(100, props.goal.progress_percentage ?? 0)))
const percent = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(props.goal.progress_percentage ?? 0))
const valueText = computed(() => t('goals.progressText', { percentage: percent.value, allocated: formatBRL(props.goal.allocated_centavos), target: formatBRL(props.goal.target_centavos) }))
</script>

<template>
  <div class="goal-progress">
    <div class="goal-progress-track" role="progressbar" :aria-label="t('goals.progress')" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="visual" :aria-valuetext="valueText">
      <div class="goal-progress-fill" :style="{ width: `${visual}%` }" />
    </div>
    <p class="goal-progress-text">{{ valueText }}</p>
    <p v-if="props.goal.excess_centavos > 0" class="goal-progress-excess">{{ t('goals.excess', { amount: formatBRL(props.goal.excess_centavos) }) }}</p>
  </div>
</template>

<style scoped>
.goal-progress { display: grid; gap: 6px; min-width: 0; }
.goal-progress-track { height: 10px; overflow: hidden; border-radius: var(--radius-full, 999px); background: var(--color-surface-tertiary); }
.goal-progress-fill { height: 100%; border-radius: inherit; background: var(--color-action-primary); }
.goal-progress-text, .goal-progress-excess { margin: 0; color: var(--color-text-muted); font-size: 14px; line-height: 20px; }
.goal-progress-excess { color: var(--color-text); font-weight: 600; }
</style>
