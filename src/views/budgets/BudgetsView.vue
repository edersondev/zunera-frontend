<script setup>
import { computed, onMounted, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import BudgetEmptyState from '@/components/budgets/BudgetEmptyState.vue'
import BudgetMonthNavigator from '@/components/budgets/BudgetMonthNavigator.vue'
import BudgetPlanFormDialog from '@/components/budgets/BudgetPlanFormDialog.vue'
import BudgetPlanList from '@/components/budgets/BudgetPlanList.vue'
import BudgetSummary from '@/components/budgets/BudgetSummary.vue'
import CopyBudgetDialog from '@/components/budgets/CopyBudgetDialog.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import RemoveBudgetPlanDialog from '@/components/budgets/RemoveBudgetPlanDialog.vue'
import { useBudgetStore } from '@/stores/budgets/budgetStore'

const { t } = useI18n()
const store = useBudgetStore()

const planFormOpen = shallowRef(false)
const editingPlan = shallowRef(null)
const removeDialogOpen = shallowRef(false)
const removingPlan = shallowRef(null)
const copyDialogOpen = shallowRef(false)
const copySource = shallowRef(null)

const fieldErrors = computed(() => store.mutationError?.errors ?? {})
const isLoading = computed(() => store.loading)
const hasBudget = computed(() => store.hasBudget)
const hasPlans = computed(() => store.plans.length > 0)
const canCopyPrevious = computed(() => !hasBudget.value && store.copySource !== null)

async function reload() {
  await store.fetchMonth()

  if (!store.hasBudget) {
    await store.findPreviousBudgetSource()
  }
}

async function changeMonth(nextMonth) {
  store.setSelectedMonth(nextMonth.year, nextMonth.month)
  await reload()
}

function openCreatePlan() {
  editingPlan.value = null
  store.clearMutationError()
  planFormOpen.value = true
  store.loadCategories()
}

function openEditPlan(plan) {
  editingPlan.value = plan
  store.clearMutationError()
  planFormOpen.value = true
  store.loadCategories()
}

function openRemovePlan(plan) {
  removingPlan.value = plan
  store.clearMutationError()
  removeDialogOpen.value = true
}

function openCopy(source = null) {
  copySource.value = source
  store.clearMutationError()
  copyDialogOpen.value = true
}

async function submitPlan(payload) {
  const wasEditing = editingPlan.value !== null
  const result = wasEditing
    ? await store.updatePlan(editingPlan.value.id, payload)
    : await store.addPlan(payload)

  if (result === null) return

  planFormOpen.value = false
  editingPlan.value = null
  ElMessage.success(t(wasEditing ? 'budgets.messages.planUpdated' : 'budgets.messages.planCreated'))
}

async function confirmRemove(plan) {
  const result = await store.removePlan(plan.id)

  if (result === null) return

  removeDialogOpen.value = false
  removingPlan.value = null
  ElMessage.success(t('budgets.messages.planRemoved'))
}

async function confirmCopy(destination) {
  const sourceId = copySource.value?.id ?? store.budget?.id ?? null
  const result = await store.copyMonth(destination, sourceId)

  if (result === null) return

  copyDialogOpen.value = false
  ElMessage.success(t('budgets.messages.copied'))
  await reload()
}

async function createMonth() {
  const result = await store.createMonth()

  if (result === null) return

  ElMessage.success(t('budgets.messages.created'))
}

watch(
  () => store.mutationError,
  (error) => {
    if (!error) return

    if (error.code === 'budget_plan_conflict') {
      ElMessage.error(t('budgets.errors.planConflict'))
    }
  },
)

onMounted(reload)
</script>

<template>
  <div class="grid gap-5">
    <PageHeader :title="t('budgets.title')" :description="t('budgets.description')">
      <template #actions>
        <BudgetMonthNavigator
          :month="store.selectedMonth"
          :loading="isLoading"
          @change-month="changeMonth"
        />
      </template>
    </PageHeader>

    <ElAlert
      v-if="store.error"
      type="error"
      :closable="false"
      show-icon
      :title="t('budgets.states.error')"
    >
      <ElButton size="small" @click="reload">{{ t('budgets.states.retry') }}</ElButton>
    </ElAlert>

    <section v-else-if="isLoading" aria-live="polite">
      <span class="sr-only">{{ t('budgets.states.loading') }}</span>
      <ElSkeleton :rows="6" animated />
    </section>

    <template v-else>
      <BudgetEmptyState
        v-if="!hasBudget"
        state="no-budget"
        :can-copy="canCopyPrevious"
        @create="createMonth"
        @copy="openCopy(store.copySource)"
      />

      <template v-else>
        <BudgetSummary v-if="store.summary" :summary="store.summary" />
        <p
          class="m-0 text-sm text-[var(--el-text-color-secondary)]"
          data-test="budget-card-recognition-note"
        >
          {{ t('creditCards.history.budgetRecognition') }}
        </p>
        <BudgetEmptyState v-if="!hasPlans" state="no-plans" @add="openCreatePlan" />
        <BudgetPlanList
          :plans="store.plans"
          :loading="store.submitting"
          @add="openCreatePlan"
          @copy="openCopy()"
          @edit="openEditPlan"
          @remove="openRemovePlan"
        />
      </template>
    </template>

    <BudgetPlanFormDialog
      v-model="planFormOpen"
      :plan="editingPlan"
      :categories="store.availableExpenseCategories"
      :submitting="store.submitting"
      :field-errors="fieldErrors"
      @submit="submitPlan"
    />
    <RemoveBudgetPlanDialog
      v-model="removeDialogOpen"
      :plan="removingPlan"
      :submitting="store.submitting"
      @confirm="confirmRemove"
    />
    <CopyBudgetDialog
      v-model="copyDialogOpen"
      :source-month="copySource ?? store.selectedMonth"
      :submitting="store.submitting"
      :error="store.mutationError"
      @copy="confirmCopy"
    />
  </div>
</template>
