<script setup>
import { useI18n } from 'vue-i18n'
import { ElTag } from 'element-plus'
import GoalProgress from './GoalProgress.vue'
import { formatBRL } from '@/utils/financial-accounts/currency'

const props = defineProps({ goal: { type: Object, required: true } })
const { t } = useI18n()
</script>

<template>
  <article class="goal-card" :data-test="`goal-card-${props.goal.id}`">
    <div class="goal-card-head">
      <RouterLink :to="{ name: 'goal-detail', params: { goal_id: props.goal.id } }" class="goal-link">{{ props.goal.name }}</RouterLink>
      <ElTag>{{ t(`goals.status.${props.goal.status}`) }}</ElTag>
    </div>
    <GoalProgress :goal="props.goal" />
    <p class="goal-card-remaining">{{ t('goals.remaining', { amount: formatBRL(props.goal.remaining_centavos) }) }}</p>
    <p v-if="props.goal.account_backing !== 'available'" class="goal-card-warning">{{ t(`goals.backing.${props.goal.account_backing}`) }}</p>
  </article>
</template>

<style scoped>
.goal-card { display: grid; gap: 12px; min-width: 0; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.goal-card-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
.goal-link { color: var(--color-action-primary); font-weight: 700; overflow-wrap: anywhere; }
.goal-card-remaining, .goal-card-warning { margin: 0; }
.goal-card-warning { color: var(--color-warning); font-weight: 600; }
</style>
