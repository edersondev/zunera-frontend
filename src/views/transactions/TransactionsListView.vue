<script setup>
import { computed, onMounted, shallowRef, watch } from 'vue'
import { ArrowDown, Delete, Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import MonthNavigator from '@/components/common/MonthNavigator.vue'
import TransactionDetailDrawer from '@/components/transactions/TransactionDetailDrawer.vue'
import TransactionFilterBar from '@/components/transactions/TransactionFilterBar.vue'
import TransactionFinancialSummary from '@/components/transactions/TransactionFinancialSummary.vue'
import TransactionFormDialog from '@/components/transactions/TransactionFormDialog.vue'
import TransactionHistoryList from '@/components/transactions/TransactionHistoryList.vue'
import TransactionRemoveDialog from '@/components/transactions/TransactionRemoveDialog.vue'
import TransferLifecycleConfirmDialog from '@/components/transfers/TransferLifecycleConfirmDialog.vue'
import { useTransactionStore } from '@/stores/transactions/transactionStore'
import { useTransferStore } from '@/stores/transfers/transferStore'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'
import { useCategoryStore } from '@/stores/categories/categoryStore'
import { formatCentavos } from '@/utils/transfers/transferFormatters'
import { getDashboardSummary } from '@/services/dashboardService'
import { listFinancialHistory } from '@/services/transactionService'
import { hasNonDateFilters, monthBounds, periodFromBounds } from '@/utils/transactions/transactionPeriod'

const store = useTransactionStore()
const transferStore = useTransferStore()
const accounts = useFinancialAccountStore()
const categories = useCategoryStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const dialog = shallowRef(false)
const creationType = shallowRef('expense')
const editingTransfer = shallowRef(null)
const transferRemoveDialog = shallowRef(false)
const removingTransfer = shallowRef(null)
const detailOpen = shallowRef(false)
const editing = shallowRef(null)
const removeDialog = shallowRef(false)
const removingTransaction = shallowRef(null)
const periodSummary = shallowRef(null)
const summaryError = shallowRef(false)
const emptyKind = shallowRef('period')
const lastQuerySignature = shallowRef(null)
let summaryRequest = 0
let emptyRequest = 0

const clearedFilters = {
  include: undefined,
  view: 'active',
  per_page: 50,
  q: undefined,
  type: undefined,
  status: undefined,
  financial_account_id: undefined,
  category_id: undefined,
  from: undefined,
  to: undefined,
}

const period = computed(() => periodFromBounds(store.filters.from, store.filters.to))
const hasActiveFilters = computed(() => hasNonDateFilters(store.filters) || period.value.custom)
const summaryEligible = computed(() =>
  !hasNonDateFilters(store.filters) && Boolean(store.filters.from && store.filters.to) && store.filters.view !== 'removed',
)
const listResetKey = computed(() => JSON.stringify({ ...store.filters, page: 1 }))

function impactMessage(impact) {
  const sign = impact.delta > 0 ? '+ ' : '− '

  return `${impact.name}: ${formatCentavos(impact.after)} (${sign}${formatCentavos(Math.abs(impact.delta))})`
}

async function loadSummary(filters) {
  const request = ++summaryRequest
  periodSummary.value = null
  summaryError.value = false
  if (hasNonDateFilters(filters) || !filters.from || !filters.to || filters.view === 'removed') return

  try {
    const data = await getDashboardSummary({ preset: 'custom', from: filters.from, to: filters.to })
    if (request !== summaryRequest) return
    periodSummary.value = {
      income_centavos: data.realized_income.amount_centavos,
      expense_centavos: data.realized_expenses.amount_centavos,
      financial_result_centavos: data.financial_result.amount_centavos,
    }
  } catch {
    if (request === summaryRequest) summaryError.value = true
  }
}

async function loadEmptyKind(filters) {
  const request = ++emptyRequest
  emptyKind.value = 'period'
  if (hasNonDateFilters(filters) || store.items.length || store.loading) return

  try {
    const data = await listFinancialHistory({ view: 'active', per_page: 1, page: 1 })
    if (request === emptyRequest) emptyKind.value = data.meta.total === 0 ? 'none' : 'period'
  } catch {
    /* Keep the truthful period empty state when global history is unavailable. */
  }
}

async function syncRoute(query) {
  const { highlight, ...routeFilters } = query
  const resolved = periodFromBounds(routeFilters.from, routeFilters.to)
  const bounds = resolved.missing ? monthBounds(resolved.month) : { from: routeFilters.from, to: routeFilters.to }
  const normalized = { ...routeFilters, ...bounds }
  const signature = JSON.stringify(Object.entries(normalized)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, value == null ? null : String(value)]))
  if (signature === lastQuerySignature.value) return
  lastQuerySignature.value = signature
  if (resolved.missing) await router.replace({ query: { ...query, ...bounds } })

  const filters = {
    ...clearedFilters,
    ...normalized,
    per_page: Number(routeFilters.per_page ?? 50),
    view: routeFilters.view ?? 'active',
  }
  const listRequest = ++emptyRequest
  const listLoad = store.setFilters(filters)
  loadSummary(filters)
  try {
    await listLoad
    if (listRequest === emptyRequest) await loadEmptyKind(filters)
  } catch {
    /* Store error renders separately. */
  }

  return highlight
}

onMounted(async () => {
  store.clearFeedback()
  transferStore.clearFeedback()

  try {
    const [highlight] = await Promise.all([
      syncRoute(route.query),
      accounts.fetchAccounts(),
      categories.fetchCategories('active'),
    ])

    const transactionId = Number(highlight)
    if (Number.isInteger(transactionId) && transactionId > 0) {
      await store.select(transactionId)
      detailOpen.value = true
    }
  } catch {
    /* Feedback comes from relevant store error state. */
  }
})

watch(() => route.query, (query) => { syncRoute(query) })

async function save({ kind, payload }) {
  try {
    if (kind === 'transfer') {
      if (editingTransfer.value) await transferStore.update(editingTransfer.value.id, payload)
      else await transferStore.create(payload)
      await store.fetch()
    } else if (editing.value) await store.update(editing.value.id, payload)
    else await store.create(payload)
    dialog.value = false
    editing.value = null
    editingTransfer.value = null
    loadSummary(store.filters)
  } catch {
    /* Feedback comes from store error state. */
  }
}

async function editTransfer(transfer) {
  try {
    editingTransfer.value = await transferStore.select(transfer.id)
    editing.value = null
    creationType.value = 'transfer'
    dialog.value = true
  } catch {
    /* Feedback comes from transfer store error state. */
  }
}

async function updateTransferStatus(transfer, status) {
  try {
    await transferStore.update(transfer.id, { status })
    await store.fetch()
    loadSummary(store.filters)
  } catch {
    /* Feedback comes from transfer store error state. */
  }
}

function requestTransferRemove(transfer) {
  removingTransfer.value = transfer
  transferRemoveDialog.value = true
}

async function removeTransfer() {
  try {
    await transferStore.remove(removingTransfer.value.id)
    await store.fetch()
    loadSummary(store.filters)
  } catch {
    /* Feedback comes from transfer store error state. */
  } finally {
    transferRemoveDialog.value = false
    removingTransfer.value = null
  }
}

async function openDetail(row) {
  if (row.movement_kind === 'credit_card_expense') return

  await store.select(row.movement_kind === 'transfer' ? row : row.id)
  detailOpen.value = true
}

async function viewRecurrenceRule(ruleId) {
  detailOpen.value = false
  await router.push({ name: 'recurring-transactions', query: { highlight: ruleId } })
}

function edit(transaction) {
  detailOpen.value = false
  editing.value = transaction
  dialog.value = true
}

function requestRemove(transaction) {
  removingTransaction.value = transaction
  removeDialog.value = true
}

async function updateStatus(transaction, status) {
  try {
    await store.update(transaction.id, { status })
    loadSummary(store.filters)
  } catch {
    /* Feedback comes from store error state. */
  }
}

async function remove() {
  try {
    await store.remove(removingTransaction.value.id)
    detailOpen.value = false
    loadSummary(store.filters)
  } catch {
    /* Feedback comes from store error state. */
  } finally {
    removeDialog.value = false
    removingTransaction.value = null
  }
}

async function applyFilters(filters) {
  const next = { ...filters, include: Object.hasOwn(filters, 'include') ? filters.include : store.filters.include }
  if (!next.from && !next.to) Object.assign(next, monthBounds(period.value.month))
  const query = Object.fromEntries(Object.entries(next).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  ))
  await router.replace({ query })

  return syncRoute(query)
}

function clearFilters() {
  return applyFilters({ ...clearedFilters, from: store.filters.from, to: store.filters.to })
}

function changeMonth(month) {
  return applyFilters({ ...store.filters, ...monthBounds(month), page: 1 })
}

function handleHeaderAction(command) {
  if (command === 'new') {
    openCreate('expense')

    return
  }

  if (command === 'removed') router.push({ name: 'transactions-removed' })
}

function openCreate(type) {
  editing.value = null
  editingTransfer.value = null
  creationType.value = type
  dialog.value = true
}

function updateDialog(visible) {
  dialog.value = visible
  if (!visible) {
    editing.value = null
    editingTransfer.value = null
    store.clearValidationErrors()
    transferStore.clearValidationErrors()
  }
}
</script>

<template>
  <div class="transactions-view">
    <PageHeader :title="t('transactions.title')" :description="t('transactions.description')">
      <template #actions>
        <div class="header-actions">
          <div class="period-control">
            <MonthNavigator
              :month="period.month"
              :loading="store.loading"
              :previous-label="t('transactions.monthPrevious')"
              :next-label="t('transactions.monthNext')"
              test-prefix="transaction-month"
              @change-month="changeMonth"
            />
            <span v-if="period.custom" class="custom-period" data-test="transaction-custom-period">{{ t('transactions.customPeriod') }}</span>
          </div>
          <ElDropdown trigger="click" @command="handleHeaderAction">
          <ElButton type="primary" :icon="Plus" data-test="transactions-header-menu">
            {{ t('transactions.new') }}
            <ElIcon class="transactions-menu-chevron"><ArrowDown /></ElIcon>
          </ElButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="new" data-test="new-transaction">
                <ElIcon><Plus /></ElIcon>
                <span>{{ t('transactions.new') }}</span>
              </ElDropdownItem>
              <ElDropdownItem command="removed" data-test="open-removed-transactions">
                <ElIcon><Delete /></ElIcon>
                <span>{{ t('transactions.removed') }}</span>
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
          </ElDropdown>
        </div>
      </template>
    </PageHeader>

    <ElAlert
      v-if="store.error"
      type="error"
      show-icon
      :title="store.error.message"
      class="feedback"
      data-test="transaction-error"
    />
    <ElAlert
      v-if="transferStore.error"
      type="error"
      show-icon
      :title="transferStore.error.message"
      class="feedback"
      data-test="transfer-error"
    />
    <ElAlert
      v-if="store.notice"
      type="warning"
      show-icon
      :title="store.notice.message"
      class="feedback"
      data-test="transaction-notice"
    />
    <ElAlert
      v-if="transferStore.notice"
      type="warning"
      show-icon
      :title="transferStore.notice.message"
      class="feedback"
      data-test="transfer-notice"
    />
    <ElAlert
      v-for="impact in store.lastBalanceImpact ?? []"
      :key="impact.id"
      type="success"
      show-icon
      :title="t('transactions.balanceUpdated', { impact: impactMessage(impact) })"
      class="feedback"
      data-test="balance-impact"
    />
    <ElAlert
      v-for="impact in transferStore.lastBalanceImpact ?? []"
      :key="`transfer-${impact.id}`"
      type="success"
      show-icon
      :title="t('transfers.balanceUpdated', { impact: impactMessage(impact) })"
      class="feedback"
      data-test="transfer-balance-impact"
    />

    <TransactionFinancialSummary v-if="summaryEligible" :totals="periodSummary" />
    <ElAlert v-if="summaryError && summaryEligible" type="info" :title="t('transactions.summary.unavailable')" :closable="false" />
    <TransactionFilterBar
      :filters="store.filters"
      :accounts="accounts.accounts"
      :categories="categories.categories"
      :loading="store.loading"
      :show-period-chip="period.custom"
      @apply="applyFilters"
      @clear="clearFilters"
    />
    <TransactionHistoryList
      :items="store.items"
      :meta="store.meta"
      :categories="categories.categories"
      :loading="store.loading"
      :transaction-saving="store.saving"
      :transfer-saving="transferStore.saving"
      :has-more="store.hasMore"
      :filtered="hasActiveFilters"
      :empty-kind="emptyKind"
      :reset-key="listResetKey"
      @select="openDetail"
      @edit-transaction="edit"
      @edit-transfer="editTransfer"
      @update-transaction-status="updateStatus"
      @update-transfer-status="updateTransferStatus"
      @remove-transaction="requestRemove"
      @remove-transfer="requestTransferRemove"
      @load-more="store.loadMore"
      @clear-filters="clearFilters"
      @create="openCreate('expense')"
    />

    <TransactionFormDialog
      :model-value="dialog"
      :transaction="editing"
      :transfer="editingTransfer"
      :initial-type="creationType"
      :accounts="accounts.accounts"
      :categories="categories.categories"
      :saving="store.saving || transferStore.saving"
      :errors="{ ...store.validationErrors, ...transferStore.validationErrors }"
      @update:model-value="updateDialog"
      @submit="save"
    />
    <TransferLifecycleConfirmDialog
      v-model:visible="transferRemoveDialog"
      :transfer="removingTransfer"
      action="remove"
      :loading="transferStore.saving"
      @confirm="removeTransfer"
    />
    <TransactionDetailDrawer
      v-model="detailOpen"
      :transaction="store.selected"
      @edit="edit"
      @remove="requestRemove"
      @view-rule="viewRecurrenceRule"
    />
    <TransactionRemoveDialog
      v-model:visible="removeDialog"
      :transaction="removingTransaction"
      :loading="store.saving"
      @confirm="remove"
    />
  </div>
</template>

<style scoped>
.transactions-view {
  display: grid;
  gap: 24px;
}

.feedback {
  margin: 0;
}

.transactions-menu-chevron {
  margin-left: 4px;
}

.header-actions {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.period-control {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.custom-period {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}

@media (max-width: 767px) {
  .header-actions { flex-wrap: wrap; }
}

@media (max-width: 639px) {
  .header-actions, .period-control { width: 100%; }
  .header-actions { display: grid; }
  .header-actions :deep(.el-dropdown),
  .header-actions :deep(.el-dropdown .el-button) { width: 100%; }
}
</style>
