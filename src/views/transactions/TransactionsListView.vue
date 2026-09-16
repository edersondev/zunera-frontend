<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { ArrowDown, Delete, Money, Plus, Switch } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import TransactionFormDialog from '@/components/transactions/TransactionFormDialog.vue'
import TransferLifecycleConfirmDialog from '@/components/transfers/TransferLifecycleConfirmDialog.vue'
import TransactionFilterBar from '@/components/transactions/TransactionFilterBar.vue'
import TransactionDetailDrawer from '@/components/transactions/TransactionDetailDrawer.vue'
import TransactionRemoveDialog from '@/components/transactions/TransactionRemoveDialog.vue'
import TransactionRowActions from '@/components/transactions/TransactionRowActions.vue'
import TransferRowActions from '@/components/transfers/TransferRowActions.vue'
import { useTransactionStore } from '@/stores/transactions/transactionStore'
import { useTransferStore } from '@/stores/transfers/transferStore'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'
import { useCategoryStore } from '@/stores/categories/categoryStore'
import {
  formatTransactionAmount,
  formatTransactionDate,
} from '@/utils/transactions/transactionFormatters'
import {
  accountLabel,
  formatTransferAmount,
  formatTransferRoute,
} from '@/utils/transfers/transferFormatters'
import {
  sourceLabel,
} from '@/utils/recurring-transactions/recurringTransactionFormatters'

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

const criteriaLabels = computed(() => ({
  q: t('transactions.criteria.q'),
  type: t('transactions.criteria.type'),
  status: t('transactions.criteria.status'),
  financial_account_id: t('transactions.criteria.financial_account_id'),
  category_id: t('transactions.criteria.category_id'),
  from: t('transactions.criteria.from'),
  to: t('transactions.criteria.to'),
}))
const activeCriteria = computed(() =>
  Object.entries(store.filters)
    .filter(
      ([key, value]) =>
        Object.hasOwn(criteriaLabels.value, key) &&
        value !== undefined &&
        value !== null &&
        value !== '',
    )
    .map(([key, value]) => `${criteriaLabels.value[key]}: ${value}`),
)
function formatCentavos(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
}

function impactMessage(impact) {
  const sign = impact.delta > 0 ? '+ ' : '− '

  return `${impact.name}: ${formatCentavos(impact.after)} (${sign}${formatCentavos(Math.abs(impact.delta))})`
}

onMounted(async () => {
  const { highlight, ...routeFilters } = route.query
  const query = {
    ...routeFilters,
    per_page: Number(routeFilters.per_page ?? 50),
    view: routeFilters.view ?? 'active',
  }

  try {
    await Promise.all([
      store.setFilters(query),
      accounts.fetchAccounts(),
      categories.fetchCategories('active'),
    ])

    const transactionId = Number(highlight)
    if (Number.isInteger(transactionId) && transactionId > 0) {
      await store.select(transactionId)
      detailOpen.value = true
    }
  } catch {
    /* Feedback comes from the relevant store error state. */
  }
})

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
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function editTransfer(transfer) {
  try {
    editingTransfer.value = await transferStore.select(transfer.id)
    editing.value = null
    creationType.value = 'transfer'
    dialog.value = true
  } catch {
    /* Feedback comes from the transfer store error state. */
  }
}

async function updateTransferStatus(transfer, status) {
  try {
    await transferStore.update(transfer.id, { status })
    await store.fetch()
  } catch {
    /* Feedback comes from the transfer store error state. */
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
  } catch {
    /* Feedback comes from the transfer store error state. */
  } finally {
    transferRemoveDialog.value = false
    removingTransfer.value = null
  }
}

async function openDetail(row) {
  await store.select(row.movement_kind === 'transfer' ? row : row.id)
  detailOpen.value = true
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
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function remove() {
  try {
    await store.remove(removingTransaction.value.id)
    detailOpen.value = false
  } catch {
    /* Feedback comes from the store error state. */
  } finally {
    removeDialog.value = false
    removingTransaction.value = null
  }
}

async function applyFilters(filters) {
  const query = Object.fromEntries(
    Object.entries(filters).filter(
      ([key, value]) => key !== 'include' && value !== undefined && value !== null && value !== '',
    ),
  )
  await router.replace({ query })

  return store.setFilters(filters)
}

function handleHeaderAction(command) {
  if (command === 'new') {
    openCreate('expense')

    return
  }

  if (command === 'removed') router.push({ name: 'transactions-removed' })
}

function handleTransferHeaderAction(command) {
  if (command === 'new') {
    editingTransfer.value = null
    openCreate('transfer')

    return
  }

  if (command === 'removed') router.push({ name: 'transfers-removed' })
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
</script>

<template>
  <div>
    <PageHeader :title="t('transactions.title')" :description="t('transactions.description')">
      <template #actions>
        <ElDropdown trigger="click" @command="handleHeaderAction">
          <ElButton type="primary" :icon="Money" data-test="transactions-header-menu">
            {{ t('transactions.transaction') }}
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
        <ElDropdown class="ml-4" trigger="click" @command="handleTransferHeaderAction">
          <ElButton type="primary" :icon="Switch" data-test="transfers-header-menu">
            {{ t('transfers.title') }}
            <ElIcon class="transactions-menu-chevron"><ArrowDown /></ElIcon>
          </ElButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="new" data-test="new-transfer-from-transactions">
                <ElIcon><Plus /></ElIcon>
                <span>{{ t('transfers.new') }}</span>
              </ElDropdownItem>
              <ElDropdownItem
                command="removed"
                data-test="open-removed-transfers-from-transactions"
              >
                <ElIcon><Delete /></ElIcon>
                <span>{{ t('transfers.removed') }}</span>
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
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
    <TransactionFilterBar
      :filters="store.filters"
      :accounts="accounts.accounts"
      :categories="categories.categories"
      :loading="store.loading"
      @apply="applyFilters"
      @clear="applyFilters(clearedFilters)"
    />
    <p v-if="activeCriteria.length" class="criteria" data-test="active-criteria">
      {{ t('transactions.activeCriteria') }}: {{ activeCriteria.join(' · ') }}
    </p>
    <ElDescriptions
      v-if="store.totals"
      :title="t('transfers.totals.label')"
      :column="3"
      border
      class="totals"
      data-test="history-totals"
    >
      <ElDescriptionsItem :label="t('transfers.totals.income')">
        <span data-test="history-total-income">{{
          formatCentavos(store.totals.income_centavos)
        }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transfers.totals.expense')">
        <span data-test="history-total-expense">{{
          formatCentavos(store.totals.expense_centavos)
        }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transfers.totals.result')">
        <span data-test="history-total-result">{{
          formatCentavos(store.totals.financial_result_centavos)
        }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :span="3" class="totals-note">
        <span data-test="history-total-excludes">{{ t('transfers.totals.excludes') }}</span>
      </ElDescriptionsItem>
    </ElDescriptions>
    <section aria-labelledby="transactions-title">
      <h2 id="transactions-title" data-test="transaction-count">
        {{ t('transactions.count', { count: store.meta.total ?? 0 }) }}
      </h2>
      <ElTable
        v-loading="store.loading"
        :data="store.items"
        :row-key="(row) => `${row.movement_kind ?? 'transaction'}-${row.id}`"
        data-test="transaction-table"
        @row-click="openDetail"
      >
        <ElTableColumn :label="t('transactions.columns.description')" min-width="180">
          <template #default="{ row }">
            <span v-if="row.movement_kind === 'transfer'" data-test="transfer-history-label">
              {{ t('transfers.transfer') }}
            </span>
            <span v-else>{{ row.description }}</span>
            <ElTag
              v-if="row.movement_kind !== 'transfer' && row.recurrence_source"
              class="source-tag"
              effect="plain"
              size="small"
              data-test="transaction-recurrence-label"
            >
              {{ sourceLabel(row.recurrence_source, t) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.date')" min-width="130">
          <template #default="{ row }">
            {{ formatTransactionDate(row.movement_date ?? row.transaction_date) }}
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.account')" min-width="150">
          <template #default="{ row }">
            <span v-if="row.movement_kind === 'transfer'" data-test="transfer-history-route">
              {{ accountLabel(row.source_financial_account, t) }} →
              {{ accountLabel(row.destination_financial_account, t) }}
            </span>
            <template v-else>
              {{ row.financial_account.name
              }}<span v-if="row.financial_account.status === 'archived'">
                ({{ t('transactions.archived') }})</span
              >
            </template>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.category')" min-width="150">
          <template #default="{ row }">
            <span v-if="row.movement_kind === 'transfer'" data-test="transfer-history-no-category">
              {{ t('transfers.noNotes') }}
            </span>
            <template v-else>
              {{ row.category.name
              }}<span v-if="row.category.status === 'archived'">
                ({{ t('transactions.archived') }})</span
              >
            </template>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.amount')" min-width="180">
          <template #default="{ row }">
            <span
              v-if="row.movement_kind === 'transfer'"
              class="transfer"
              data-test="transfer-history-amount"
            >
              {{ formatTransferAmount(row) }} · {{ formatTransferRoute(row, t) }}
            </span>
            <span v-else :class="row.type === 'income' ? 'income' : 'expense'">
              {{ formatTransactionAmount(row) }} ·
              {{ row.type === 'income' ? t('transactions.income') : t('transactions.expense') }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.status')" min-width="110">
          <template #default="{ row }">
            <ElTag :type="row.status === 'pending' ? 'warning' : undefined">{{
              t(`transactions.${row.status}`)
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn width="64" align="center">
          <template #default="{ row }">
            <TransferRowActions
              v-if="row.movement_kind === 'transfer'"
              :transfer="row"
              :saving="transferStore.saving"
              @edit="editTransfer"
              @update-status="updateTransferStatus"
              @remove="requestTransferRemove"
            />
            <TransactionRowActions
              v-else
              :transaction="row"
              :saving="store.saving"
              @edit="edit"
              @update-status="updateStatus"
              @remove="requestRemove"
            />
          </template>
        </ElTableColumn>
      </ElTable>
    </section>
    <ElEmpty
      v-if="!store.loading && store.items.length === 0"
      :description="t('transactions.empty')"
      data-test="transaction-empty"
    />
    <div class="more">
      <ElButton
        v-if="store.hasMore"
        :loading="store.loading"
        data-test="load-more"
        @click="store.loadMore"
      >
        {{ t('transactions.loadMore') }}
      </ElButton>
    </div>
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
.feedback {
  margin-bottom: 16px;
}
.transactions-menu-chevron {
  margin-left: 4px;
}
.criteria {
  color: var(--color-text-muted, #666);
  font-size: 14px;
  margin: 0 0 12px;
}
h2 {
  color: var(--color-text);
  font-size: 20px;
  margin: 0 0 12px;
}
.income {
  color: var(--color-financial-positive);
  font-variant-numeric: tabular-nums;
}
.expense {
  color: var(--color-financial-negative);
  font-variant-numeric: tabular-nums;
}
.totals {
  margin-bottom: 16px;
}
.totals-note {
  color: var(--color-text-muted, #666);
  font-size: 13px;
}
.transfer {
  font-variant-numeric: tabular-nums;
}
.more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
