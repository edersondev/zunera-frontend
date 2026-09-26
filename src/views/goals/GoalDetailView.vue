<script setup>
import { computed, onMounted, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElAlert, ElButton, ElSkeleton } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import GoalProgress from '@/components/goals/GoalProgress.vue'
import GoalAccountCoverage from '@/components/goals/GoalAccountCoverage.vue'
import GoalDateGuidance from '@/components/goals/GoalDateGuidance.vue'
import GoalActivityList from '@/components/goals/GoalActivityList.vue'
import GoalAmountDialog from '@/components/goals/GoalAmountDialog.vue'
import GoalFormDialog from '@/components/goals/GoalFormDialog.vue'
import { listFinancialAccounts } from '@/services/financialAccountService'
import { useFinancialGoalStore } from '@/stores/goals/financialGoalStore'
import { formatBRL } from '@/utils/financial-accounts/currency'

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
    <ElButton text @click="router.push({ name: 'goals' })">{{ t('goals.back') }}</ElButton>
    <ElAlert v-if="error" type="error" :title="error.message" :closable="false" show-icon><ElButton @click="load">{{ t('common.retry') }}</ElButton></ElAlert>
    <ElSkeleton v-if="loading && !goal" :rows="5" animated />
    <template v-else-if="goal">
      <PageHeader :title="goal.name" :description="t('goals.description')" />
      <ElAlert v-if="notice" type="success" :title="notice" :closable="false" show-icon />
      <ElAlert v-if="mutationError" type="error" :title="mutationError.message" :closable="false" show-icon />
      <p v-if="goal.description" class="goal-description">{{ goal.description }}</p>
      <section class="detail-panel" :aria-label="t('goals.progress')">
        <p class="goal-status">{{ t(`goals.status.${goal.status}`) }}</p>
        <GoalProgress :goal="goal" />
        <p>{{ t('goals.remaining', { amount: formatBRL(goal.remaining_centavos) }) }}</p>
      </section>
      <section class="detail-panel"><h2>{{ t('goals.accountCoverage') }}</h2><GoalAccountCoverage :goal="goal" /></section>
      <section v-if="goal.target_date" class="detail-panel"><GoalDateGuidance :goal="goal" /></section>
      <section class="detail-panel" :aria-label="t('goals.actions')">
        <h2>{{ t('goals.actions') }}</h2>
        <div class="action-row" v-if="goal.status === 'active'">
          <ElButton type="primary" :disabled="submitting" data-test="allocate-goal" @click="openAmount('allocate')">{{ t('goals.allocate') }}</ElButton>
          <ElButton :disabled="submitting || !availableActions.includes('withdraw')" data-test="withdraw-goal" @click="openAmount('withdraw')">{{ t('goals.withdraw') }}</ElButton>
          <ElButton :disabled="submitting" @click="openEdit">{{ t('goals.edit') }}</ElButton>
          <ElButton :disabled="submitting" data-test="complete-goal" @click="transition('complete')">{{ t('goals.complete') }}</ElButton>
          <ElButton type="warning" :disabled="submitting || !availableActions.includes('archive')" data-test="archive-goal" @click="transition('archive')">{{ t('goals.archive') }}</ElButton>
        </div>
        <div class="action-row" v-else-if="goal.status === 'completed'"><ElButton :disabled="submitting" @click="transition('reopen')">{{ t('goals.reopen') }}</ElButton></div>
        <div class="action-row" v-else><ElButton :disabled="submitting" @click="transition('restore')">{{ t('goals.restore') }}</ElButton></div>
        <p v-if="goal.status === 'active' && goal.allocated_centavos > 0" class="action-help">{{ t('goals.archiveHelp') }}</p>
      </section>
      <section class="detail-panel"><h2>{{ t('goals.activity') }}</h2><GoalActivityList :items="activities" :meta="activityMeta" @page-change="store.fetchActivities(props.goalId, $event)" /></section>
      <GoalAmountDialog v-model="amountOpen" :action="amountAction" :busy="submitting" :error="mutationError" @submit="submitAmount" />
      <GoalFormDialog v-model="editOpen" :goal="goal" :accounts="accounts" :busy="submitting" :error="mutationError" @submit="saveEdit" />
    </template>
  </div>
</template>

<style scoped>
.goal-detail { display: grid; gap: 16px; min-width: 0; }
.goal-description { white-space: pre-wrap; overflow-wrap: anywhere; }
.detail-panel { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.detail-panel h2, .detail-panel p { margin: 0; }
.goal-status { font-weight: 700; }
.action-row { display: flex; flex-wrap: wrap; gap: 8px; }
.action-row :deep(.el-button) { min-height: 44px; }
.action-help { color: var(--color-text-muted); }
</style>
