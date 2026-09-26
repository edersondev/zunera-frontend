<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatGoalMoney, formatGoalPercent } from '@/utils/goals/goalPresentation'

const props = defineProps({ goal: { type: Object, required: true }, label: { type: String, default: '' }, showAmounts: { type: Boolean, default: true } })
const { t, locale } = useI18n()
const visual = computed(() => Math.max(0, Math.min(100, props.goal.progress_percentage ?? 0)))
const percent = computed(() => formatGoalPercent(props.goal.progress_percentage ?? 0, locale.value))
const valueText = computed(() => t('goals.progressText', { percentage: percent.value, allocated: formatGoalMoney(props.goal.allocated_centavos, locale.value), target: formatGoalMoney(props.goal.target_centavos, locale.value) }))
</script>

<template>
  <div class="goal-progress">
    <div class="goal-progress-track" :class="{ 'is-completed': props.goal.status === 'completed', 'is-archived': props.goal.status === 'archived' }" role="progressbar" :aria-label="props.label || t('goals.progress')" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="visual" :aria-valuetext="valueText">
      <div class="goal-progress-fill" :style="{ width: `${visual}%` }" />
      <span v-if="visual > 0 && visual < 0.5" class="goal-progress-marker" aria-hidden="true" />
    </div>
    <p class="goal-progress-text">{{ props.showAmounts ? valueText : `${percent}%` }}</p>
    <p v-if="props.goal.excess_centavos > 0" class="goal-progress-excess">{{ t('goals.excess', { amount: formatGoalMoney(props.goal.excess_centavos, locale) }) }}</p>
  </div>
</template>

<style scoped>
.goal-progress { display: grid; gap: 6px; min-width: 0; }
.goal-progress-track { position: relative; height: 10px; overflow: hidden; border-radius: var(--radius-full, 999px); background: var(--color-surface-tertiary); }
.goal-progress-fill { height: 100%; border-radius: inherit; background: var(--color-action-primary); }
.goal-progress-track.is-completed .goal-progress-fill { background: var(--color-success); }
.goal-progress-track.is-archived .goal-progress-fill, .goal-progress-track.is-archived .goal-progress-marker { background: var(--color-text-muted); }
.goal-progress-marker { position: absolute; inset: 0 auto 0 0; width: 2px; border-radius: inherit; background: var(--color-action-primary); }
.goal-progress-text, .goal-progress-excess { margin: 0; color: var(--color-text-muted); font-size: 14px; line-height: 20px; }
.goal-progress-excess { color: var(--color-text); font-weight: 600; }
</style>
