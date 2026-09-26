<script setup>
import { computed, onMounted, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElEmpty, ElPagination, ElSkeleton } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import GoalCard from '@/components/goals/GoalCard.vue'
import GoalFormDialog from '@/components/goals/GoalFormDialog.vue'
import { listFinancialAccounts } from '@/services/financialAccountService'
import { useFinancialGoalStore } from '@/stores/goals/financialGoalStore'
import { formatBRL } from '@/utils/financial-accounts/currency'

const props = defineProps({ initialStatus: { type: String, default: 'active' } })
const store = useFinancialGoalStore()
const { goals, completedGoals, archivedGoals, summary, summaryLoading, summaryError, listMeta, loading, error, mutationError, submitting } = storeToRefs(store)
const { t } = useI18n()
const router = useRouter()
const status = shallowRef(props.initialStatus)
const formOpen = shallowRef(false)
const accounts = shallowRef([])
const accountError = shallowRef(null)
const records = computed(() => status.value === 'completed' ? completedGoals.value : status.value === 'archived' ? archivedGoals.value : goals.value)
const statusRoutes = { active: 'goals', completed: 'goals-completed', archived: 'goals-archived' }
watch(() => props.initialStatus, (next) => { status.value = next; store.fetchGoals(next) })
onMounted(() => {
  store.fetchGoals(status.value)
  store.fetchSummary()
  listFinancialAccounts().then((items) => { accounts.value = items }).catch((failure) => { accountError.value = failure })
})
async function create(payload) {
  const outcome = await store.create(payload)
  if (outcome.ok) {
    formOpen.value = false
    await router.push({ name: 'goal-detail', params: { goal_id: outcome.result.id } })
  }
}
function switchStatus(next) { router.push({ name: statusRoutes[next] }) }
function openCreate() { store.clearMutationError(); formOpen.value = true }
</script>

<template>
  <div class="goals-page">
    <PageHeader :title="t('goals.title')" :description="t('goals.description')">
      <template #actions><ElButton type="primary" :icon="Plus" data-test="open-create-goal" @click="openCreate">{{ t('goals.new') }}</ElButton></template>
    </PageHeader>
    <ElAlert v-if="error" type="error" :title="error.message" :closable="false" show-icon><ElButton @click="store.fetchGoals(status)">{{ t('common.retry') }}</ElButton></ElAlert>
    <ElAlert v-if="accountError" type="warning" :title="accountError.message" :closable="false" show-icon />
    <ElSkeleton v-if="summaryLoading && !summary" :rows="2" animated />
    <ElAlert v-else-if="summaryError" type="error" :title="summaryError.message" :closable="false" show-icon><ElButton @click="store.fetchSummary()">{{ t('common.retry') }}</ElButton></ElAlert>
    <section v-if="summary" class="goal-summary" :aria-label="t('goals.summary')" data-test="goal-summary">
      <dl class="summary-grid">
        <div><dt>{{ t('goals.totalTarget') }}</dt><dd>{{ formatBRL(summary.active_target_centavos) }}</dd></div>
        <div><dt>{{ t('goals.totalAllocated') }}</dt><dd>{{ formatBRL(summary.active_allocated_centavos) }}</dd></div>
        <div><dt>{{ t('goals.totalRemaining') }}</dt><dd>{{ formatBRL(summary.active_remaining_centavos) }}</dd></div>
        <div><dt>{{ t('goals.unverifiedTotal') }}</dt><dd>{{ formatBRL(summary.active_unverified_centavos) }}</dd></div>
      </dl>
      <h2>{{ t('goals.attention') }}</h2>
      <ul class="attention-list">
        <li>{{ t('goals.overdueCount', { count: summary.attention_counts.overdue_underfunded_active_goals }) }}</li>
        <li>{{ t('goals.shortfallCount', { count: summary.attention_counts.shortfall_linked_goals }) }}</li>
        <li>{{ t('goals.inactiveCount', { count: summary.attention_counts.inactive_or_unavailable_linked_goals }) }}</li>
      </ul>
    </section>
    <nav class="status-nav" :aria-label="t('goals.title')">
      <ElButton v-for="next in ['active', 'completed', 'archived']" :key="next" :type="status === next ? 'primary' : 'default'" :aria-current="status === next ? 'page' : undefined" @click="switchStatus(next)">{{ t(`goals.${next}`) }}</ElButton>
    </nav>
    <ElSkeleton v-if="loading && records.length === 0" :rows="4" animated />
    <ElEmpty v-else-if="records.length === 0 && !error" :description="t('goals.empty')" />
    <div v-else class="goal-grid"><GoalCard v-for="item in records" :key="item.id" :goal="item" /></div>
    <ElPagination v-if="listMeta?.last_page > 1" :current-page="listMeta.current_page" :page-count="listMeta.last_page" layout="prev, pager, next" @current-change="store.fetchGoals(status, $event)" />
    <GoalFormDialog v-model="formOpen" :accounts="accounts" :busy="submitting" :error="mutationError" @submit="create" />
  </div>
</template>

<style scoped>
.goals-page { display: grid; gap: 24px; min-width: 0; }
.goal-summary { display: grid; gap: 16px; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.goal-summary h2 { margin: 0; font-size: 18px; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 0; }
.summary-grid div { padding: 12px; border-radius: var(--radius-md); background: var(--color-surface-secondary); }
.summary-grid dt { color: var(--color-text-muted); font-size: 12px; }
.summary-grid dd { margin: 4px 0 0; font-variant-numeric: tabular-nums; font-weight: 700; overflow-wrap: anywhere; }
.attention-list { display: grid; gap: 4px; margin: 0; padding-left: 20px; }
.status-nav { display: flex; flex-wrap: wrap; gap: 8px; }
.goal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 16px; }
</style>
