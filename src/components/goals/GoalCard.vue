<script setup>
import { computed } from 'vue'
import { ArrowRight, Warning } from '@element-plus/icons-vue'
import { ElIcon, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import GoalProgress from './GoalProgress.vue'
import { formatGoalCompletionDate, formatGoalDate, formatGoalMoney } from '@/utils/goals/goalPresentation'

const props = defineProps({ goal: { type: Object, required: true } })
const { t, locale } = useI18n()
const overdue = computed(() => props.goal.status === 'active' && props.goal.target_date_state === 'overdue' && props.goal.remaining_centavos > 0)
const shortfall = computed(() => props.goal.account_backing === 'shortfall')
const unavailable = computed(() => props.goal.account_backing === 'inactive_or_unavailable')
const needsAttention = computed(() => overdue.value || shortfall.value || unavailable.value)
const statusType = computed(() => props.goal.status === 'completed' ? 'success' : props.goal.status === 'archived' ? 'info' : undefined)
</script>

<template>
  <article class="goal-card" :class="{ 'needs-attention': needsAttention, 'is-archived': props.goal.status === 'archived' }" :data-test="`goal-card-${props.goal.id}`">
    <header class="goal-card-head">
      <h3>{{ props.goal.name }}</h3>
      <ElTag :type="statusType" effect="plain" size="small">{{ t(`goals.status.${props.goal.status}`) }}</ElTag>
    </header>
    <div class="goal-amount">
      <strong>{{ formatGoalMoney(props.goal.allocated_centavos, locale) }}</strong>
      <p>{{ t('goals.ofTarget', { amount: formatGoalMoney(props.goal.target_centavos, locale) }) }}</p>
    </div>
    <GoalProgress :goal="props.goal" :show-amounts="false" />
    <p class="goal-remaining">{{ t('goals.remaining', { amount: formatGoalMoney(props.goal.remaining_centavos, locale) }) }}</p>
    <p v-if="props.goal.target_date" class="goal-meta">{{ t('goals.targetDateLabel', { date: formatGoalDate(props.goal.target_date, locale) }) }}</p>
    <p v-if="props.goal.status === 'completed' && props.goal.completed_at" class="goal-meta">{{ t('goals.completedOn', { date: formatGoalCompletionDate(props.goal.completed_at, locale) }) }}</p>
    <p v-if="props.goal.financial_account && !needsAttention" class="goal-meta">{{ t('goals.linkedAccountLabel', { name: props.goal.financial_account.name }) }}</p>
    <p v-if="props.goal.account_backing === 'unverified'" class="goal-meta">{{ t('goals.backing.unverified') }}</p>
    <div v-if="needsAttention" class="goal-warning">
      <ElTag type="warning" effect="plain" size="small"><ElIcon aria-hidden="true"><Warning /></ElIcon>{{ t('goals.attention') }}</ElTag>
      <p v-if="overdue">{{ t('goals.cardOverdue') }}</p>
      <p v-if="shortfall">{{ props.goal.financial_account?.shortfall_centavos > 0 ? t('goals.shortfall', { amount: formatGoalMoney(props.goal.financial_account.shortfall_centavos, locale) }) : t('goals.backing.shortfall') }}</p>
      <p v-if="unavailable">{{ t('goals.backing.inactive_or_unavailable') }}</p>
    </div>
    <RouterLink :to="{ name: 'goal-detail', params: { goal_id: props.goal.id } }" class="goal-details" :aria-label="t('goals.viewDetailsFor', { name: props.goal.name })">
      {{ t('goals.viewDetails') }} <ElIcon aria-hidden="true"><ArrowRight /></ElIcon>
    </RouterLink>
  </article>
</template>

<style scoped>
.goal-card { display: grid; align-content: start; gap: 14px; min-width: 0; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.goal-card.needs-attention { border-left: 4px solid var(--color-warning); padding-left: 17px; }
.goal-card.is-archived { background: var(--color-surface-secondary); }
.goal-card-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 8px; }
.goal-card-head h3 { margin: 0; min-width: 0; color: var(--color-text); font-size: 20px; line-height: 28px; overflow-wrap: anywhere; }
.goal-amount strong { color: var(--color-text); font-size: 26px; line-height: 32px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.goal-amount p, .goal-remaining, .goal-meta, .goal-warning p { margin: 0; }
.goal-amount p, .goal-meta { color: var(--color-text-muted); font-size: 14px; line-height: 20px; overflow-wrap: anywhere; }
.goal-remaining { color: var(--color-text); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.goal-warning { display: grid; justify-items: start; gap: 5px; color: var(--color-text-subtle); font-size: 14px; }
.goal-warning .el-icon { margin-right: 4px; }
.goal-details { display: inline-flex; width: fit-content; min-height: 44px; align-items: center; gap: 6px; margin-top: 2px; border-radius: var(--radius-md); color: var(--color-action-primary); font-size: 14px; font-weight: 600; text-decoration: none; }
.goal-details:hover { color: var(--color-action-primary-hover); text-decoration: underline; }
.goal-details:focus-visible { outline: 2px solid var(--color-action-primary); outline-offset: 3px; }
@media (max-width: 639px) { .goal-card { padding: 16px; } .goal-card.needs-attention { padding-left: 13px; } }
</style>
