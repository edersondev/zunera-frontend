<script setup>
import { useI18n } from 'vue-i18n'
import { formatGoalDate, formatGoalMoney } from '@/utils/goals/goalPresentation'

const props = defineProps({ goal: { type: Object, required: true } })
const { t, locale } = useI18n()
</script>

<template>
  <section class="planning" :aria-label="t('goals.planning')">
    <h2>{{ t('goals.planning') }}</h2>
    <template v-if="props.goal.target_date">
      <dl class="planning-facts">
        <div><dt>{{ t('goals.targetDateHeading') }}</dt><dd>{{ formatGoalDate(props.goal.target_date, locale) }}</dd></div>
        <div v-if="props.goal.remaining_calendar_days != null && props.goal.target_date_state === 'future'"><dt>{{ t('goals.timeRemaining') }}</dt><dd>{{ t('goals.daysRemaining', { count: props.goal.remaining_calendar_days }) }}</dd></div>
      </dl>
      <p v-if="props.goal.target_date_state && props.goal.target_date_state !== 'future'" class="date-state" :class="{ 'is-overdue': props.goal.target_date_state === 'overdue' }">{{ t(`goals.dateState.${props.goal.target_date_state}`) }}</p>
      <div v-if="props.goal.suggested_monthly_centavos != null" class="monthly-plan">
        <p>{{ t('goals.suggestedMonthly') }}</p>
        <strong>{{ formatGoalMoney(props.goal.suggested_monthly_centavos, locale) }}<span> {{ t('goals.perMonth') }}</span></strong>
        <p v-if="props.goal.contribution_periods_remaining">{{ t('goals.planningPeriods', { count: props.goal.contribution_periods_remaining }) }}</p>
      </div>
      <p class="guidance-note">{{ t('goals.guidanceDisclaimer') }}</p>
    </template>
    <p v-else class="guidance-note">{{ t('goals.noTargetDate') }}</p>
  </section>
</template>

<style scoped>
.planning { display: grid; align-content: start; gap: 16px; min-width: 0; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.planning h2, .planning p { margin: 0; }
.planning h2 { color: var(--color-text); font-size: 18px; line-height: 26px; }
.planning-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 0; }
.planning-facts dt, .monthly-plan p { color: var(--color-text-muted); font-size: 13px; }
.planning-facts dd { margin: 4px 0 0; color: var(--color-text); font-weight: 600; overflow-wrap: anywhere; }
.monthly-plan { display: grid; gap: 4px; padding-top: 16px; border-top: 1px solid var(--color-border); }
.monthly-plan strong { color: var(--color-text); font-size: 24px; line-height: 32px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.monthly-plan strong span { color: var(--color-text-muted); font-size: 14px; font-weight: 400; }
.guidance-note { color: var(--color-text-muted); font-size: 13px; line-height: 20px; }
.date-state { color: var(--color-text-subtle); font-size: 14px; }
.date-state.is-overdue { color: var(--color-warning); font-weight: 600; }
@media (max-width: 639px) { .planning { padding: 16px; } }
</style>
