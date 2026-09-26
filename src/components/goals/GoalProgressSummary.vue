<script setup>
import { computed } from 'vue'
import { Warning } from '@element-plus/icons-vue'
import { ElIcon, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import GoalProgress from './GoalProgress.vue'
import { formatGoalCompletionDate, formatGoalMoney } from '@/utils/goals/goalPresentation'

const props = defineProps({ goal: { type: Object, required: true } })
const { t, locale } = useI18n()
const overdue = computed(() => props.goal.status === 'active' && props.goal.target_date_state === 'overdue' && props.goal.remaining_centavos > 0)
const needsAttention = computed(() => overdue.value || props.goal.account_backing === 'shortfall' || props.goal.account_backing === 'inactive_or_unavailable')
</script>

<template>
  <section class="progress-summary" :class="{ 'needs-attention': needsAttention, 'is-archived': props.goal.status === 'archived' }" :aria-label="t('goals.progress')">
    <h2>{{ t('goals.progress') }}</h2>
    <div class="progress-amount">
      <strong>{{ formatGoalMoney(props.goal.allocated_centavos, locale) }}</strong>
      <p>{{ t('goals.ofTarget', { amount: formatGoalMoney(props.goal.target_centavos, locale) }) }}</p>
    </div>
    <GoalProgress :goal="props.goal" :show-amounts="false" />
    <p class="progress-remaining">{{ t('goals.remaining', { amount: formatGoalMoney(props.goal.remaining_centavos, locale) }) }}</p>
    <p v-if="props.goal.status === 'completed' && props.goal.completed_at" class="progress-meta">{{ t('goals.completedOn', { date: formatGoalCompletionDate(props.goal.completed_at, locale) }) }}</p>
    <div v-if="needsAttention" class="progress-attention">
      <ElTag type="warning" effect="plain" size="small"><ElIcon aria-hidden="true"><Warning /></ElIcon>{{ t('goals.attention') }}</ElTag>
      <p v-if="overdue">{{ t('goals.cardOverdue') }}</p>
      <p v-if="props.goal.account_backing === 'shortfall'">{{ t('goals.backing.shortfall') }}</p>
      <p v-if="props.goal.account_backing === 'inactive_or_unavailable'">{{ t('goals.backing.inactive_or_unavailable') }}</p>
    </div>
  </section>
</template>

<style scoped>
.progress-summary { display: grid; gap: 18px; min-width: 0; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.progress-summary.needs-attention { border-left: 4px solid var(--color-warning); padding-left: 21px; }
.progress-summary.is-archived { background: var(--color-surface-secondary); }
.progress-summary h2, .progress-summary p { margin: 0; }
.progress-summary h2 { color: var(--color-text); font-size: 18px; line-height: 26px; }
.progress-amount strong { display: block; color: var(--color-text); font-size: clamp(30px, 5vw, 42px); line-height: 1.2; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.progress-amount p, .progress-meta { color: var(--color-text-muted); font-size: 14px; }
.progress-remaining { color: var(--color-text); font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.progress-attention { display: grid; justify-items: start; gap: 6px; padding-top: 14px; border-top: 1px solid var(--color-border); color: var(--color-text-subtle); font-size: 14px; }
.progress-attention .el-icon { margin-right: 4px; }
@media (max-width: 639px) { .progress-summary { padding: 16px; } .progress-summary.needs-attention { padding-left: 13px; } }
</style>
