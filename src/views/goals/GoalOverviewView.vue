<script setup>
import { computed, onMounted, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { CircleCheck, FolderDelete, List, Plus, RefreshRight } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElEmpty, ElIcon, ElPagination, ElSkeleton } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import GoalCard from '@/components/goals/GoalCard.vue'
import GoalsOverview from '@/components/goals/GoalsOverview.vue'
import GoalAttentionSummary from '@/components/goals/GoalAttentionSummary.vue'
import GoalFormDialog from '@/components/goals/GoalFormDialog.vue'
import { listFinancialAccounts } from '@/services/financialAccountService'
import { showActionSuccess } from '@/services/actionMessage'
import { useFinancialGoalStore } from '@/stores/goals/financialGoalStore'

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
const statusIcons = { active: List, completed: CircleCheck, archived: FolderDelete }
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
    showActionSuccess(t('goals.feedback.created'))
    await router.push({ name: 'goal-detail', params: { goal_id: outcome.result.id } })
  }
}
function openCreate() { store.clearMutationError(); formOpen.value = true }
</script>

<template>
  <div class="goals-page">
    <PageHeader :title="t('goals.title')" :description="t('goals.description')">
      <template #actions><ElButton type="primary" :icon="Plus" data-test="open-create-goal" @click="openCreate">{{ t('goals.new') }}</ElButton></template>
    </PageHeader>
    <ElAlert v-if="error" type="error" :title="error.message" :closable="false" show-icon><ElButton :icon="RefreshRight" @click="store.fetchGoals(status)">{{ t('common.retry') }}</ElButton></ElAlert>
    <ElAlert v-if="accountError" type="warning" :title="accountError.message" :closable="false" show-icon />
    <ElSkeleton v-if="summaryLoading && !summary" :rows="2" animated />
    <ElAlert v-else-if="summaryError" type="error" :title="summaryError.message" :closable="false" show-icon><ElButton :icon="RefreshRight" @click="store.fetchSummary()">{{ t('common.retry') }}</ElButton></ElAlert>
    <GoalsOverview v-if="summary" :summary="summary" />
    <GoalAttentionSummary v-if="summary" :counts="summary.attention_counts" />
    <nav class="status-nav" :aria-label="t('goals.statusNavigation')">
      <RouterLink v-for="next in ['active', 'completed', 'archived']" :key="next" :to="{ name: statusRoutes[next] }" class="status-link" :class="{ 'is-current': status === next }" :aria-current="status === next ? 'page' : undefined">
        <ElIcon aria-hidden="true"><component :is="statusIcons[next]" /></ElIcon>
        <span>{{ t(`goals.${next}`) }}</span>
        <span v-if="summary" class="status-count">{{ summary[`${next}_count`] ?? 0 }}</span>
      </RouterLink>
    </nav>
    <h2 class="visually-hidden">{{ t('goals.listHeading', { status: t(`goals.${status}`) }) }}</h2>
    <ElSkeleton v-if="loading && records.length === 0" :rows="4" animated />
    <ElEmpty v-else-if="records.length === 0 && !error" class="goals-empty" :image-size="64" :description="t(`goals.emptyState.${status}`)">
      <ElButton v-if="status === 'active'" type="primary" :icon="Plus" @click="openCreate">{{ t('goals.new') }}</ElButton>
    </ElEmpty>
    <div v-else-if="records.length" class="goal-grid"><GoalCard v-for="item in records" :key="item.id" :goal="item" /></div>
    <ElPagination v-if="listMeta?.last_page > 1" :current-page="listMeta.current_page" :page-count="listMeta.last_page" layout="prev, pager, next" @current-change="store.fetchGoals(status, $event)" />
    <GoalFormDialog v-model="formOpen" :accounts="accounts" :busy="submitting" :error="mutationError" @submit="create" />
  </div>
</template>

<style scoped>
.goals-page { display: grid; gap: 24px; min-width: 0; }
.goals-page :deep(.page-header) { margin-bottom: 0; }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.status-nav { display: flex; gap: 4px; min-width: 0; overflow-x: auto; border-bottom: 1px solid var(--color-border); }
.status-link { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 8px; min-height: 44px; padding: 8px 12px; border-bottom: 2px solid transparent; color: var(--color-text-subtle); font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap; }
.status-link:hover { color: var(--color-action-primary-hover); }
.status-link.is-current { border-bottom-color: var(--color-action-primary); color: var(--color-action-primary); }
.status-link:focus-visible { outline: 2px solid var(--color-action-primary); outline-offset: -3px; }
.status-count { padding: 1px 7px; border-radius: var(--radius-full); background: var(--color-surface-secondary); color: var(--color-text-subtle); font-variant-numeric: tabular-nums; }
.status-link.is-current .status-count { background: var(--color-action-primary-subtle); color: var(--color-action-primary); }
.goal-grid { display: grid; gap: 16px; min-width: 0; grid-template-columns: minmax(0, 1fr); }
.goals-empty { min-height: 180px; padding: 16px; border: 1px dashed var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
@media (min-width: 900px) { .goal-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
