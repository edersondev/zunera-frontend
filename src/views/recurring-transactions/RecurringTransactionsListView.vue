<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import RecurringTransactionDetailDrawer from '@/components/recurring-transactions/RecurringTransactionDetailDrawer.vue'
import RecurringTransactionFilterBar from '@/components/recurring-transactions/RecurringTransactionFilterBar.vue'
import RecurringTransactionFormDialog from '@/components/recurring-transactions/RecurringTransactionFormDialog.vue'
import RecurringCardOccurrenceDialog from '@/components/recurring-transactions/RecurringCardOccurrenceDialog.vue'
import RecurringTransactionLifecycleDialog from '@/components/recurring-transactions/RecurringTransactionLifecycleDialog.vue'
import RecurringTransactionList from '@/components/recurring-transactions/RecurringTransactionList.vue'
import { useCategoryStore } from '@/stores/categories/categoryStore'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'
import { useRecurringTransactionStore } from '@/stores/recurring-transactions/recurringTransactionStore'

const store = useRecurringTransactionStore()
const accounts = useFinancialAccountStore()
const categories = useCategoryStore()
const cards = useCreditCardStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const dialog = shallowRef(false)
const editing = shallowRef(null)
const detailOpen = shallowRef(false)
const lifecycleOpen = shallowRef(false)
const lifecycleAction = shallowRef('pause')
const lifecycleRule = shallowRef(null)
const occurrenceOpen = shallowRef(false)
const selectedOccurrence = shallowRef(null)
const expandedRuleId = shallowRef(null)
const reviewPreview = shallowRef(null)
const reviewLoadingRuleId = shallowRef(null)
let reviewRequest = 0
const filtered = computed(() => ['type', 'destination_type', 'financial_account_id', 'credit_card_id', 'category_id', 'frequency', 'state']
  .some((key) => store.filters[key] !== undefined && store.filters[key] !== null && store.filters[key] !== ''))
const accountOptions = computed(() => [
  ...(accounts.accounts ?? []),
  ...(accounts.archivedAccounts ?? []),
])
const categoryOptions = computed(() => [
  ...(categories.categories ?? []),
  ...(categories.archivedCategories ?? []),
])
const cardOptions = computed(() => [
  ...(cards.cards ?? []),
  ...(cards.archivedCards ?? []),
])
const lifecycleError = computed(() => store.error?.message ?? '')

onMounted(async () => {
  const { highlight, ...routeFilters } = route.query
  const query = { ...routeFilters, per_page: Number(routeFilters.per_page ?? 50) }

  try {
    await Promise.all([
      store.setFilters(query),
      accounts.fetchAccounts(),
      categories.fetchCategories(),
      cards.fetchCards(),
    ])

    const ruleId = Number(highlight)
    if (Number.isInteger(ruleId) && ruleId > 0) {
      await store.select(ruleId)
      detailOpen.value = true
    }
  } catch {
    /* Feedback comes from the relevant store error state. */
  }
})

async function applyFilters(value) {
  reviewRequest += 1
  expandedRuleId.value = null
  reviewPreview.value = null
  await router.replace({ query: { ...value, per_page: value.per_page ?? 50 } })
  try {
    await store.setFilters(value)
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function clearFilters() {
  await applyFilters({
    per_page: 50,
    type: undefined,
    financial_account_id: undefined,
    destination_type: undefined,
    credit_card_id: undefined,
    category_id: undefined,
    frequency: undefined,
    state: undefined,
  })
}

async function save(payload) {
  try {
    if (editing.value) await store.update(editing.value.id, payload)
    else await store.create(payload)
    updateDialog(false)
  } catch {
    /* Feedback comes from the store error state. */
  }
}

function updateDialog(visible) {
  dialog.value = visible
  if (!visible) {
    editing.value = null
    store.clearValidationErrors()
  }
}

function openCreate() {
  editing.value = null
  store.clearFeedback()
  dialog.value = true
}

function openEdit(rule) {
  editing.value = rule
  store.clearFeedback()
  dialog.value = true
}

async function openDetail(rule) {
  try {
    await store.select(rule.id)
    detailOpen.value = true
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function loadReviewPreview(rule, openDialog = false) {
  const request = ++reviewRequest
  reviewLoadingRuleId.value = rule.id
  reviewPreview.value = null
  try {
    const occurrence = await store.findNewestReviewableOccurrence(rule.id)
    if (request !== reviewRequest) return
    reviewPreview.value = occurrence
    if (openDialog && occurrence) {
      selectedOccurrence.value = occurrence
      store.clearFeedback()
      occurrenceOpen.value = true
    } else if (openDialog && !occurrence) {
      store.error = { message: t('recurringTransactions.reviewUnavailable') }
    }
  } catch (error) {
    if (request === reviewRequest) store.error = error
  } finally {
    if (request === reviewRequest) reviewLoadingRuleId.value = null
  }
}

function toggleExpanded(rule) {
  if (expandedRuleId.value === rule.id) {
    expandedRuleId.value = null
    reviewPreview.value = null
    reviewRequest += 1
    return
  }
  expandedRuleId.value = rule.id
  reviewPreview.value = null
  if (rule.reviewable_occurrence_count > 0) loadReviewPreview(rule)
}

async function refreshAfterOccurrence(ruleId) {
  await store.select(ruleId)
  if (expandedRuleId.value === ruleId && store.selected?.reviewable_occurrence_count > 0) {
    await loadReviewPreview(store.selected)
  } else {
    reviewPreview.value = null
  }
}

function confirmLifecycle(action, rule) {
  lifecycleAction.value = action
  lifecycleRule.value = rule
  store.clearFeedback()
  lifecycleOpen.value = true
}

async function runLifecycle() {
  try {
    await store[lifecycleAction.value](lifecycleRule.value.id)
    lifecycleOpen.value = false
    if (detailOpen.value) await store.select(lifecycleRule.value.id)
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function openOccurrence(occurrence) {
  if (occurrence.state) {
    selectedOccurrence.value = occurrence
    store.clearFeedback()
    occurrenceOpen.value = true

    return
  }
  detailOpen.value = false
  await router.push({ name: 'transactions', query: { highlight: occurrence.id } })
}

async function confirmOccurrence(payload) {
  try {
    const ruleId = store.selected.id
    const result = await store.confirmOccurrence(ruleId, selectedOccurrence.value.id, payload)
    selectedOccurrence.value = result
    occurrenceOpen.value = result.state !== 'recorded' && result.state !== 'dismissed'
    await refreshAfterOccurrence(ruleId)
  } catch {
    if (['OVER_LIMIT_CONFIRMATION_REQUIRED', 'stale_over_limit_confirmation'].includes(store.error?.code)) {
      await cards.fetchCards()
    }
  }
}

async function dismissOccurrence() {
  try {
    const ruleId = store.selected.id
    await store.dismissOccurrence(ruleId, selectedOccurrence.value.id)
    occurrenceOpen.value = false
    await refreshAfterOccurrence(ruleId)
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function retryOccurrence() {
  try {
    const ruleId = store.selected.id
    const result = await store.retryOccurrence(ruleId, selectedOccurrence.value.id)
    selectedOccurrence.value = result
    occurrenceOpen.value = result.state !== 'recorded' && result.state !== 'dismissed'
    await refreshAfterOccurrence(ruleId)
  } catch {
    /* Feedback comes from the store error state. */
  }
}
</script>

<template>
  <section class="page" data-test="recurring-transactions-view">
    <PageHeader :title="t('recurringTransactions.title')" :description="t('recurringTransactions.description')">
      <template #actions>
        <ElButton type="primary" :icon="Plus" data-test="recurrence-new" @click="openCreate">
          {{ t('recurringTransactions.new') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert
      class="mb-4 !py-2"
      type="info"
      :closable="false"
      show-icon
      :title="t('creditCards.recurringGuidance.title')"
      :description="t('creditCards.recurringGuidance.description')"
      data-test="credit-card-recurring-guidance"
    />

    <ElAlert v-if="store.notice" type="success" :closable="false" show-icon :title="t(store.notice)" data-test="recurrence-notice" />
    <ElAlert v-if="store.error && !lifecycleOpen" type="error" :closable="false" show-icon :title="store.error.message" data-test="recurrence-error" />
    <RecurringTransactionFilterBar
      :filters="store.filters"
      :accounts="accountOptions"
      :cards="cardOptions"
      :categories="categoryOptions"
      @apply="applyFilters"
      @clear="clearFilters"
    />

    <RecurringTransactionList
      :rules="store.items"
      :loading="store.loading"
      :has-more="store.hasMore"
      :saving="store.saving"
      :filtered="filtered"
      :expanded-rule-id="expandedRuleId"
      :review-preview="reviewPreview"
      :review-loading-rule-id="reviewLoadingRuleId"
      @toggle="toggleExpanded"
      @review="(rule) => loadReviewPreview(rule, true)"
      @view-history="openDetail"
      @clear-filters="clearFilters"
      @create="openCreate"
      @edit="openEdit"
      @pause="(rule) => confirmLifecycle('pause', rule)"
      @resume="(rule) => confirmLifecycle('resume', rule)"
      @end="(rule) => confirmLifecycle('end', rule)"
      @load-more="store.loadMore"
    />

    <RecurringTransactionFormDialog
      :model-value="dialog"
      :rule="editing"
      :accounts="accountOptions"
      :cards="cardOptions"
      :categories="categoryOptions"
      :saving="store.saving"
      :errors="store.validationErrors"
      @update:model-value="updateDialog"
      @submit="save"
    />
    <RecurringTransactionLifecycleDialog
      v-model="lifecycleOpen"
      :action="lifecycleAction"
      :rule="lifecycleRule"
      :saving="store.saving"
      :error="lifecycleError"
      @confirm="runLifecycle"
    />
    <RecurringTransactionDetailDrawer
      v-model="detailOpen"
      :rule="store.selected"
      :occurrences="store.occurrences"
      :loading-occurrences="store.loadingOccurrences"
      @open-occurrence="openOccurrence"
    />
    <RecurringCardOccurrenceDialog
      v-model="occurrenceOpen"
      :rule="store.selected"
      :occurrence="selectedOccurrence"
      :cards="cardOptions"
      :categories="categoryOptions"
      :saving="store.saving"
      :error="store.error"
      :errors="store.validationErrors"
      @confirm="confirmOccurrence"
      @dismiss="dismissOccurrence"
      @retry="retryOccurrence"
    />
  </section>
</template>
