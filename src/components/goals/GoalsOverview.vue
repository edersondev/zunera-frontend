<script setup>
import { computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'
import { useI18n } from 'vue-i18n'
import GoalProgress from './GoalProgress.vue'
import { formatGoalMoney } from '@/utils/goals/goalPresentation'

const props = defineProps({ summary: { type: Object, required: true } })
const { t, locale } = useI18n()
const fundedTarget = computed(() => Math.max(0, props.summary.active_target_centavos - props.summary.active_remaining_centavos))
const progress = computed(() => ({
  allocated_centavos: fundedTarget.value,
  target_centavos: props.summary.active_target_centavos,
  excess_centavos: props.summary.active_excess_centavos ?? 0,
  progress_percentage: props.summary.active_target_centavos > 0
    ? fundedTarget.value / props.summary.active_target_centavos * 100
    : 0,
}))
</script>

<template>
  <section class="goals-overview" :aria-label="t('goals.summary')" data-test="goal-summary">
    <h2>{{ t('goals.summary') }}</h2>
    <dl class="overview-values">
      <div class="allocated"><dt>{{ t('goals.totalAllocated') }}</dt><dd>{{ formatGoalMoney(props.summary.active_allocated_centavos, locale) }}</dd></div>
      <div><dt>{{ t('goals.totalRemaining') }}</dt><dd>{{ formatGoalMoney(props.summary.active_remaining_centavos, locale) }}</dd></div>
      <div><dt>{{ t('goals.totalTarget') }}</dt><dd>{{ formatGoalMoney(props.summary.active_target_centavos, locale) }}</dd></div>
    </dl>
    <GoalProgress v-if="props.summary.active_target_centavos > 0" :goal="progress" :label="t('goals.overallProgress')" />
    <p v-else class="overview-note">{{ t('goals.noActiveTarget') }}</p>
    <div class="overview-note" :class="{ 'has-unverified': props.summary.active_unverified_centavos > 0 }">
      <p><ElIcon v-if="props.summary.active_unverified_centavos > 0" aria-hidden="true"><InfoFilled /></ElIcon>{{ t('goals.unverifiedTotal') }}: {{ formatGoalMoney(props.summary.active_unverified_centavos, locale) }}</p>
      <p v-if="props.summary.active_unverified_centavos > 0">{{ t('goals.unverifiedHelp') }}</p>
    </div>
  </section>
</template>

<style scoped>
.goals-overview { display: grid; gap: 20px; min-width: 0; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.goals-overview h2 { margin: 0; color: var(--color-text); font-size: 20px; line-height: 28px; }
.overview-values { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; }
.overview-values div { min-width: 0; }
.overview-values dt { color: var(--color-text-muted); font-size: 14px; line-height: 20px; }
.overview-values dd { margin: 4px 0 0; color: var(--color-text); font-size: 20px; font-weight: 700; line-height: 28px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.overview-values .allocated dd { font-size: 28px; line-height: 36px; }
.overview-note { margin: 0; color: var(--color-text-muted); font-size: 13px; line-height: 20px; }
.overview-note p { margin: 0; }
.overview-note .el-icon { margin-right: 6px; color: var(--color-info); vertical-align: -2px; }
.overview-note.has-unverified { padding-top: 12px; border-top: 1px solid var(--color-border); color: var(--color-text-subtle); }
@media (max-width: 639px) { .goals-overview { padding: 16px; } .overview-values { grid-template-columns: 1fr 1fr; } .overview-values .allocated { grid-column: 1 / -1; } }
</style>
