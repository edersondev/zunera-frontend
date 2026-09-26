<script setup>
import { useI18n } from 'vue-i18n'
import { ElAlert, ElButton, ElSkeleton } from 'element-plus'
import { formatBRL } from '@/utils/financial-accounts/currency'
import GoalProgress from '@/components/goals/GoalProgress.vue'

const props = defineProps({ goals: { type: Array, default: null }, loading: { type: Boolean, default: false }, error: { type: Object, default: null } })
const emit = defineEmits(['retry', 'open-goals'])
const { t, locale } = useI18n()
function dateLabel(value) { return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)) }
</script>

<template>
  <section v-if="props.error || props.loading || props.goals?.length" class="dashboard-goals" :aria-label="t('goals.dashboardTitle')" data-test="dashboard-goals">
    <div class="card-head"><h2>{{ t('goals.dashboardTitle') }}</h2><ElButton @click="emit('open-goals')">{{ t('goals.manage') }}</ElButton></div>
    <ElAlert v-if="props.error" type="error" :title="props.error.message" :closable="false" show-icon><ElButton @click="emit('retry')">{{ t('common.retry') }}</ElButton></ElAlert>
    <ElSkeleton v-else-if="props.loading && !props.goals?.length" :rows="3" animated />
    <ul v-else class="goal-list">
      <li v-for="goal in props.goals" :key="goal.id">
        <RouterLink :to="{ name: 'goal-detail', params: { goal_id: goal.id } }">{{ goal.name }}</RouterLink>
        <GoalProgress :goal="goal" />
        <p>{{ t('goals.remaining', { amount: formatBRL(goal.remaining_centavos) }) }}</p>
        <p v-if="goal.target_date">{{ t('goals.targetDateLabel', { date: dateLabel(goal.target_date) }) }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.dashboard-goals { display: grid; gap: 16px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.card-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
.card-head h2 { margin: 0; font-size: 20px; }
.goal-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.goal-list li { display: grid; gap: 6px; overflow-wrap: anywhere; }
.goal-list a { color: var(--color-action-primary); font-weight: 600; }
.goal-list p { margin: 0; font-variant-numeric: tabular-nums; }
@media (max-width: 639px) { .dashboard-goals { padding: 16px; } }
</style>
