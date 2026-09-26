<script setup>
import { useI18n } from 'vue-i18n'
import { ElAlert, ElButton, ElEmpty, ElSkeleton } from 'element-plus'
import { formatBRL } from '@/utils/financial-accounts/currency'

const props = defineProps({ goals: { type: Array, default: null }, loading: { type: Boolean, default: false }, error: { type: Object, default: null } })
const emit = defineEmits(['retry', 'open-goals'])
const { t } = useI18n()
</script>

<template>
  <section class="dashboard-goals" :aria-label="t('goals.dashboardTitle')" data-test="dashboard-goals">
    <div class="card-head"><h2>{{ t('goals.dashboardTitle') }}</h2><ElButton @click="emit('open-goals')">{{ t('goals.manage') }}</ElButton></div>
    <ElAlert v-if="props.error" type="error" :title="props.error.message" :closable="false" show-icon><ElButton @click="emit('retry')">{{ t('common.retry') }}</ElButton></ElAlert>
    <ElSkeleton v-else-if="props.loading && props.goals === null" :rows="3" animated />
    <ElEmpty v-else-if="!props.goals?.length" :description="t('goals.dashboardEmpty')" />
    <ul v-else class="goal-list"><li v-for="goal in props.goals" :key="goal.id"><RouterLink :to="{ name: 'goal-detail', params: { goal_id: goal.id } }">{{ goal.name }}</RouterLink><span>{{ formatBRL(goal.allocated_centavos) }} / {{ formatBRL(goal.target_centavos) }}</span></li></ul>
  </section>
</template>

<style scoped>
.dashboard-goals { display: grid; gap: 16px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.card-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
.card-head h2 { margin: 0; font-size: 20px; }
.goal-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.goal-list li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; overflow-wrap: anywhere; }
.goal-list a { color: var(--color-action-primary); font-weight: 600; }
.goal-list span { font-variant-numeric: tabular-nums; }
@media (max-width: 639px) { .dashboard-goals { padding: 16px; } }
</style>
