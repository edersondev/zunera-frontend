<script setup>
import { computed, onMounted, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowLeft, RefreshRight } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElSkeleton, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import GoalProgressSummary from '@/components/goals/GoalProgressSummary.vue'
import GoalAccountCoverage from '@/components/goals/GoalAccountCoverage.vue'
import GoalDateGuidance from '@/components/goals/GoalDateGuidance.vue'
import GoalActivityList from '@/components/goals/GoalActivityList.vue'
import GoalActions from '@/components/goals/GoalActions.vue'
import GoalAmountDialog from '@/components/goals/GoalAmountDialog.vue'
import GoalFormDialog from '@/components/goals/GoalFormDialog.vue'
import { listFinancialAccounts } from '@/services/financialAccountService'
import { useFinancialGoalStore } from '@/stores/goals/financialGoalStore'

const props = defineProps({ goalId: { type: [String, Number], required: true } })
const store = useFinancialGoalStore()
const { goal: currentGoal, activities, activityMeta, availableActions, loading, error, submitting, mutationError } = storeToRefs(store)
const { t } = useI18n()
const router = useRouter()
const goal = computed(() => Number(currentGoal.value?.id) === Number(props.goalId) ? currentGoal.value : null)
const amountOpen = shallowRef(false)
const amountAction = shallowRef('allocate')
const editOpen = shallowRef(false)
const accounts = shallowRef([])
const notice = shallowRef('')
function load() { store.fetchGoal(props.goalId); store.fetchActivities(props.goalId) }
watch(() => props.goalId, load)
onMounted(() => { load(); listFinancialAccounts().then((items) => { accounts.value = items }).catch(() => { accounts.value = [] }) })
function openAmount(action) { store.clearMutationError(); amountAction.value = action; amountOpen.value = true }
function openEdit() { store.clearMutationError(); editOpen.value = true }
async function submitAmount(amount) {
  const result = amountAction.value === 'allocate' ? await store.allocate(props.goalId, amount) : await store.withdraw(props.goalId, amount)
  if (result.ok) { amountOpen.value = false; notice.value = t(amountAction.value === 'allocate' ? 'goals.allocate' : 'goals.withdraw') }
}
async function saveEdit(payload) { const result = await store.update(props.goalId, payload); if (result.ok) { editOpen.value = false; notice.value = t('goals.save') } }
async function transition(action) { const result = await store.transition(props.goalId, action); if (result.ok) notice.value = t(`goals.${action}`) }
</script>

<template>
  <div class="goal-detail">
    <ElButton text :icon="ArrowLeft" @click="router.push({ name: 'goals' })">{{ t('goals.back') }}</ElButton>
    <ElAlert v-if="error" type="error" :title="error.message" :closable="false" show-icon><ElButton :icon="RefreshRight" @click="load">{{ t('common.retry') }}</ElButton></ElAlert>
    <ElSkeleton v-if="loading && !goal" :rows="5" animated />
    <template v-else-if="goal">
      <PageHeader :title="goal.name" :description="t('goals.description')"><template #title-meta><ElTag :type="goal.status === 'completed' ? 'success' : goal.status === 'archived' ? 'info' : undefined" effect="plain" size="small">{{ t(`goals.status.${goal.status}`) }}</ElTag></template></PageHeader>
      <ElAlert v-if="notice" type="success" :title="notice" :closable="false" show-icon />
      <ElAlert v-if="mutationError" type="error" :title="mutationError.message" :closable="false" show-icon />
      <p v-if="goal.description" class="goal-description">{{ goal.description }}</p>
      <GoalProgressSummary :goal="goal" />
      <div class="detail-context"><GoalDateGuidance :goal="goal" /><GoalAccountCoverage :goal="goal" /></div>
      <GoalActions :goal="goal" :available-actions="availableActions" :busy="submitting" @amount="openAmount" @edit="openEdit" @transition="transition" />
      <section class="detail-panel"><h2>{{ t('goals.activity') }}</h2><GoalActivityList :items="activities" :meta="activityMeta" @page-change="store.fetchActivities(props.goalId, $event)" /></section>
      <GoalAmountDialog v-model="amountOpen" :action="amountAction" :busy="submitting" :error="mutationError" @submit="submitAmount" />
      <GoalFormDialog v-model="editOpen" :goal="goal" :accounts="accounts" :busy="submitting" :error="mutationError" @submit="saveEdit" />
    </template>
  </div>
</template>

<style scoped>
.goal-detail { display: grid; gap: 20px; min-width: 0; }
.goal-detail > :deep(.el-button:first-child) { justify-self: start; margin-bottom: -12px; }
.goal-detail :deep(.page-header) { margin-bottom: 0; }
.goal-description { margin: 0; color: var(--color-text-subtle); white-space: pre-wrap; overflow-wrap: anywhere; }
.detail-context { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 16px; min-width: 0; }
.detail-panel { display: grid; gap: 12px; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.detail-panel h2 { margin: 0; color: var(--color-text); font-size: 18px; line-height: 26px; }
@media (max-width: 799px) { .detail-context { grid-template-columns: 1fr; } }
@media (max-width: 639px) { .detail-panel { padding: 16px; } }
</style>
