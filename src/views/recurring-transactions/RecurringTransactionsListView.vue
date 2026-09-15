<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import RecurringTransactionDetailDrawer from '@/components/recurring-transactions/RecurringTransactionDetailDrawer.vue'
import RecurringTransactionFilterBar from '@/components/recurring-transactions/RecurringTransactionFilterBar.vue'
import RecurringTransactionFormDialog from '@/components/recurring-transactions/RecurringTransactionFormDialog.vue'
import RecurringTransactionLifecycleDialog from '@/components/recurring-transactions/RecurringTransactionLifecycleDialog.vue'
import RecurringTransactionList from '@/components/recurring-transactions/RecurringTransactionList.vue'
import { useCategoryStore } from '@/stores/categories/categoryStore'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'
import { useRecurringTransactionStore } from '@/stores/recurring-transactions/recurringTransactionStore'

const store = useRecurringTransactionStore()
const accounts = useFinancialAccountStore()
const categories = useCategoryStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const dialog = shallowRef(false)
const editing = shallowRef(null)
const detailOpen = shallowRef(false)
const lifecycleOpen = shallowRef(false)
const lifecycleAction = shallowRef('pause')
const lifecycleRule = shallowRef(null)

const criteriaLabels = computed(() => ({
  type: t('recurringTransactions.criteria.type'),
  financial_account_id: t('recurringTransactions.criteria.financial_account_id'),
  category_id: t('recurringTransactions.criteria.category_id'),
  frequency: t('recurringTransactions.criteria.frequency'),
  state: t('recurringTransactions.criteria.state'),
}))
const activeCriteria = computed(() =>
  Object.entries(store.filters)
    .filter(([key, value]) => Object.hasOwn(criteriaLabels.value, key) && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${criteriaLabels.value[key]}: ${value}`),
)
const accountOptions = computed(() => [
  ...(accounts.accounts ?? []),
  ...(accounts.archivedAccounts ?? []),
])
const categoryOptions = computed(() => [
  ...(categories.categories ?? []),
  ...(categories.archivedCategories ?? []),
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
    category_id: undefined,
    frequency: undefined,
    state: undefined,
  })
}

async function reload() {
  try {
    await store.setFilters(store.filters)
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function save(payload) {
  try {
    if (editing.value) await store.update(editing.value.id, payload)
    else await store.create(payload)
    dialog.value = false
    editing.value = null
  } catch {
    /* Feedback comes from the store error state. */
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
  detailOpen.value = false
  await router.push({ name: 'transactions', query: { highlight: occurrence.id } })
}
</script>

<template>
  <section class="page" data-test="recurring-transactions-view">
    <PageHeader :title="t('recurringTransactions.title')" :description="t('recurringTransactions.description')" />
    <div class="page-actions">
      <ElButton :icon="Refresh" data-test="recurrence-reload" @click="reload">{{ t('common.loading') }}</ElButton>
      <ElButton type="primary" :icon="Plus" data-test="recurrence-new" @click="openCreate">
        {{ t('recurringTransactions.new') }}
      </ElButton>
    </div>

    <ElAlert v-if="store.notice" type="success" :closable="false" show-icon :title="t(store.notice)" data-test="recurrence-notice" />
    <ElAlert v-if="store.error && !lifecycleOpen" type="error" :closable="false" show-icon :title="store.error.message" data-test="recurrence-error" />
    <div v-if="activeCriteria.length" class="criteria" data-test="recurrence-active-criteria">
      <span class="muted">{{ t('recurringTransactions.activeCriteria') }}:</span>
      <ElTag v-for="criteria in activeCriteria" :key="criteria" effect="plain">{{ criteria }}</ElTag>
    </div>

    <RecurringTransactionFilterBar
      :filters="store.filters"
      :accounts="accountOptions"
      :categories="categoryOptions"
      @apply="applyFilters"
      @clear="clearFilters"
    />

    <RecurringTransactionList
      :rules="store.items"
      :loading="store.loading"
      :has-more="store.hasMore"
      @open="openDetail"
      @edit="openEdit"
      @pause="(rule) => confirmLifecycle('pause', rule)"
      @resume="(rule) => confirmLifecycle('resume', rule)"
      @end="(rule) => confirmLifecycle('end', rule)"
      @load-more="store.loadMore"
    />

    <RecurringTransactionFormDialog
      v-model="dialog"
      :rule="editing"
      :accounts="accountOptions"
      :categories="categoryOptions"
      :saving="store.saving"
      :errors="store.validationErrors"
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
  </section>
</template>
