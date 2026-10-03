<script setup>
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BudgetEmptyState from '@/components/budgets/BudgetEmptyState.vue'
import BudgetPlanFormDialog from '@/components/budgets/BudgetPlanFormDialog.vue'
import BudgetPlanList from '@/components/budgets/BudgetPlanList.vue'
import BudgetSummary from '@/components/budgets/BudgetSummary.vue'
import CopyBudgetDialog from '@/components/budgets/CopyBudgetDialog.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { showActionSuccess } from '@/services/actionMessage'
import MonthNavigator from '@/components/common/MonthNavigator.vue'
import RemoveBudgetPlanDialog from '@/components/budgets/RemoveBudgetPlanDialog.vue'
import { useBudgetStore } from '@/stores/budgets/budgetStore'

const { t } = useI18n()
const store = useBudgetStore()
const route = useRoute()
const router = useRouter()

const planFormOpen = shallowRef(false)
const editingPlan = shallowRef(null)
const removeDialogOpen = shallowRef(false)
const removingPlan = shallowRef(null)
const copyDialogOpen = shallowRef(false)
const copySource = shallowRef(null)

const fieldErrors = computed(() => store.mutationError?.errors ?? {})
const mutationMessage = computed(() => store.mutationError?.code === 'budget_plan_conflict'
  ? t('budgets.errors.planConflict')
  : '')
const isLoading = computed(() => store.loading)
const hasBudget = computed(() => store.hasBudget)
const hasPlans = computed(() => store.plans.length > 0)
const canCopyPrevious = computed(() => !hasBudget.value && store.copySource !== null)
const planId = computed(() => {
  const id = Number(route.query.plan_id)
  return Number.isSafeInteger(id) && id > 0 ? id : null
})
const selectedPlan = computed(() => store.plans.find((plan) => plan.id === planId.value) ?? null)

async function reload() {
  await store.fetchMonth()

  if (!store.hasBudget) {
    await store.findPreviousBudgetSource()
  }
}

async function changeMonth(nextMonth) {
  await router.replace({ query: { year: String(nextMonth.year), month: String(nextMonth.month) } })
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
  showActionSuccess(t(wasEditing ? 'budgets.messages.planUpdated' : 'budgets.messages.planCreated'))
}

async function confirmRemove(plan) {
  const result = await store.removePlan(plan.id)

  if (result === null) return

  removeDialogOpen.value = false
  removingPlan.value = null
  showActionSuccess(t('budgets.messages.planRemoved'))
}

async function confirmCopy(destination) {
  const sourceId = copySource.value?.id ?? store.budget?.id ?? null
  const result = await store.copyMonth(destination, sourceId)

  if (result === null) return

  copyDialogOpen.value = false
  showActionSuccess(t('budgets.messages.copied'))
  await reload()
}

async function createMonth() {
  const result = await store.createMonth()

  if (result === null) return

  showActionSuccess(t('budgets.messages.created'))
}

watch(
  () => [route.query.year, route.query.month],
  async ([yearParam, monthParam]) => {
    const year = Number(yearParam)
    const month = Number(monthParam)
    if (Number.isInteger(year) && year >= 1900 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12) {
      store.setSelectedMonth(year, month)
    }
    await reload()
  },
  { immediate: true },
)
</script>

<template>
  <div class="grid gap-5">
    <PageHeader :title="t('budgets.title')" :description="t('budgets.description')">
      <template #actions>
        <MonthNavigator
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
          :highlight-plan-id="planId"
          :loading="store.submitting"
          @add="openCreatePlan"
          @copy="openCopy()"
          @edit="openEditPlan"
          @remove="openRemovePlan"
        />
        <p v-if="selectedPlan" data-test="notification-budget-target">{{ t('notifications.budgetTarget', { name: selectedPlan.category.name }) }}</p>
      </template>
    </template>

    <BudgetPlanFormDialog
      v-model="planFormOpen"
      :plan="editingPlan"
      :categories="store.availableExpenseCategories"
      :submitting="store.submitting"
      :field-errors="fieldErrors"
      :error="mutationMessage"
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
