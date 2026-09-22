<script setup>
import { Refresh } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import TransactionRowActions from '@/components/transactions/TransactionRowActions.vue'
import TransactionStatusBadge from '@/components/transactions/TransactionStatusBadge.vue'
import TransferRowActions from '@/components/transfers/TransferRowActions.vue'
import {
  formatTransactionAmount,
  formatTransactionDate,
} from '@/utils/transactions/transactionFormatters'
import {
  accountLabel,
  formatTransferAmount,
  formatTransferRoute,
} from '@/utils/transfers/transferFormatters'
import { sourceLabel } from '@/utils/recurring-transactions/recurringTransactionFormatters'

defineProps({
  items: { type: Array, required: true },
  meta: { type: Object, required: true },
  loading: Boolean,
  transactionSaving: Boolean,
  transferSaving: Boolean,
  hasMore: Boolean,
  filtered: Boolean,
})

const emit = defineEmits([
  'select',
  'edit-transaction',
  'edit-transfer',
  'update-transaction-status',
  'update-transfer-status',
  'remove-transaction',
  'remove-transfer',
  'load-more',
  'clear-filters',
  'create',
])

const { t } = useI18n()

function movementKey(row) {
  return `${row.movement_kind ?? 'transaction'}-${row.id}`
}

function isTransfer(row) {
  return row.movement_kind === 'transfer'
}

function isCreditCardExpense(row) {
  return row.movement_kind === 'credit_card_expense'
}

function description(row) {
  if (isTransfer(row)) return row.description || t('transfers.transfer')

  return row.description
}

function movementLabel(row) {
  if (isTransfer(row)) return t('transactions.transfer')
  if (isCreditCardExpense(row)) return t('creditCards.history.recognizedExpense')

  return t(`transactions.${row.type ?? row.movement_kind ?? 'expense'}`)
}

function date(row) {
  return formatTransactionDate(row.movement_date ?? row.transaction_date)
}

function account(row) {
  if (isTransfer(row)) return formatTransferRoute(row, t)
  if (isCreditCardExpense(row)) return row.credit_card?.name ?? t('transactions.noNotes')
  if (!row.financial_account) return t('transactions.noNotes')

  return accountLabel(row.financial_account, t)
}

function category(row) {
  if (isTransfer(row)) return t('transactions.noNotes')
  if (!row.category) return t('transactions.noNotes')

  const archived = row.category.status === 'archived' ? ` (${t('transactions.archived')})` : ''

  return `${row.category.name}${archived}`
}

function amount(row) {
  return isTransfer(row) ? formatTransferAmount(row) : formatTransactionAmount(row)
}

function amountTone(row) {
  if (isTransfer(row)) return 'transfer-amount'

  return row.type === 'income' ? 'income-amount' : 'expense-amount'
}

function select(row) {
  if (isCreditCardExpense(row)) return
  emit('select', row)
}

function updateTransactionStatus(transaction, status) {
  emit('update-transaction-status', transaction, status)
}

function updateTransferStatus(transfer, status) {
  emit('update-transfer-status', transfer, status)
}
</script>

<template>
  <section class="history" aria-labelledby="transactions-title">
    <header class="history-header">
      <div>
        <h2 id="transactions-title" data-test="transaction-count">
          {{ t('transactions.count', { count: meta.total ?? 0 }) }}
        </h2>
        <p v-if="items.length" class="history-meta" data-test="transaction-loaded-count">
          {{
            t('transactions.showing', { loaded: items.length, total: meta.total ?? items.length })
          }}
        </p>
      </div>
    </header>

    <ElSkeleton v-if="loading && items.length === 0" :rows="5" animated />

    <template v-else-if="items.length">
      <div class="desktop-history">
        <ElTable
          :data="items"
          :row-key="movementKey"
          data-test="transaction-table"
          @row-click="select"
        >
          <ElTableColumn :label="t('transactions.columns.description')" min-width="210">
            <template #default="{ row }">
              <div class="description-cell">
                <span class="description-text">{{ description(row) }}</span>
                <span class="movement-label">{{ movementLabel(row) }}</span>
              </div>
              <ElTooltip
                v-if="!isTransfer(row) && row.recurrence_source"
                :content="sourceLabel(row.recurrence_source, t)"
              >
                <ElTag
                  class="recurrence-source-tag"
                  :aria-label="sourceLabel(row.recurrence_source, t)"
                  data-test="transaction-recurrence-label"
                  round
                  role="img"
                  type="primary"
                  size="small"
                >
                  <ElIcon><Refresh /></ElIcon>
                </ElTag>
              </ElTooltip>
            </template>
          </ElTableColumn>
          <ElTableColumn :label="t('transactions.columns.date')" min-width="125">
            <template #default="{ row }">
              <span class="secondary-text">{{ date(row) }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn :label="t('transactions.columns.account')" min-width="170">
            <template #default="{ row }">
              <span
                :data-test="isTransfer(row) ? 'transfer-history-route' : undefined"
                class="secondary-text"
              >
                {{ account(row) }}
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn :label="t('transactions.columns.category')" min-width="145">
            <template #default="{ row }">
              <span
                :data-test="isTransfer(row) ? 'transfer-history-no-category' : undefined"
                class="secondary-text"
              >
                {{ category(row) }}
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn
            :label="t('transactions.columns.amount')"
            min-width="145"
            align="right"
            header-align="right"
          >
            <template #default="{ row }">
              <span
                class="amount"
                :class="amountTone(row)"
                :data-test="
                  isTransfer(row) ? 'transfer-history-amount' : 'transaction-history-amount'
                "
              >
                {{ amount(row) }}
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn :label="t('transactions.columns.status')" min-width="115" align="center">
            <template #default="{ row }">
              <TransactionStatusBadge :status="row.status" />
            </template>
          </ElTableColumn>
          <ElTableColumn width="56" align="center">
            <template #default="{ row }">
              <TransferRowActions
                v-if="isTransfer(row)"
                :transfer="row"
                :saving="transferSaving"
                @edit="emit('edit-transfer', $event)"
                @update-status="updateTransferStatus"
                @remove="emit('remove-transfer', $event)"
              />
              <TransactionRowActions
                v-else-if="!isCreditCardExpense(row)"
                :transaction="row"
                :saving="transactionSaving"
                @edit="emit('edit-transaction', $event)"
                @update-status="updateTransactionStatus"
                @remove="emit('remove-transaction', $event)"
              />
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <ul class="mobile-history" data-test="transaction-mobile-list">
        <li v-for="row in items" :key="movementKey(row)" class="mobile-item">
          <div class="mobile-primary">
            <button
              v-if="!isCreditCardExpense(row)"
              type="button"
              class="mobile-description-button"
              @click="select(row)"
            >
              <span class="description-text">{{ description(row) }}</span>
              <span class="movement-label">{{ movementLabel(row) }}</span>
            </button>
            <div v-else class="mobile-description-static">
              <span class="description-text">{{ description(row) }}</span>
              <span class="movement-label">{{ movementLabel(row) }}</span>
            </div>
            <span
              class="amount"
              :class="amountTone(row)"
              :data-test="isTransfer(row) ? 'mobile-transfer-history-amount' : undefined"
            >
              {{ amount(row) }}
            </span>
          </div>

          <div class="mobile-meta">
            <span>{{ date(row) }}</span>
            <span aria-hidden="true">·</span>
            <span :data-test="isTransfer(row) ? 'mobile-transfer-history-route' : undefined">
              {{ account(row) }}
            </span>
          </div>

          <div class="mobile-footer">
            <div class="mobile-category">
              <span
                :data-test="isTransfer(row) ? 'mobile-transfer-history-no-category' : undefined"
              >
                {{ category(row) }}
              </span>
              <ElTooltip
                v-if="!isTransfer(row) && row.recurrence_source"
                :content="sourceLabel(row.recurrence_source, t)"
              >
                <ElTag
                  class="recurrence-source-tag"
                  :aria-label="sourceLabel(row.recurrence_source, t)"
                  round
                  role="img"
                  type="primary"
                  size="small"
                >
                  <ElIcon><Refresh /></ElIcon>
                </ElTag>
              </ElTooltip>
            </div>
            <TransactionStatusBadge :status="row.status" />
            <TransferRowActions
              v-if="isTransfer(row)"
              :transfer="row"
              :saving="transferSaving"
              @edit="emit('edit-transfer', $event)"
              @update-status="updateTransferStatus"
              @remove="emit('remove-transfer', $event)"
            />
            <TransactionRowActions
              v-else-if="!isCreditCardExpense(row)"
              :transaction="row"
              :saving="transactionSaving"
              @edit="emit('edit-transaction', $event)"
              @update-status="updateTransactionStatus"
              @remove="emit('remove-transaction', $event)"
            />
          </div>
        </li>
      </ul>
    </template>

    <ElEmpty
      v-else
      :image-size="64"
      :description="t(filtered ? 'transactions.noMatch' : 'transactions.empty')"
      data-test="transaction-empty"
    >
      <ElButton v-if="filtered" data-test="empty-clear-filters" @click="emit('clear-filters')">
        {{ t('transactions.clear') }}
      </ElButton>
      <ElButton v-else type="primary" data-test="empty-create-transaction" @click="emit('create')">
        {{ t('transactions.new') }}
      </ElButton>
    </ElEmpty>

    <div class="more">
      <ElButton v-if="hasMore" :loading="loading" data-test="load-more" @click="emit('load-more')">
        {{ t('transactions.loadMore') }}
      </ElButton>
    </div>
  </section>
</template>

<style scoped>
.history {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.history-header,
.history-header h2,
.history-meta {
  margin: 0;
}

.history-header h2 {
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}

.history-meta,
.secondary-text,
.movement-label,
.mobile-meta {
  color: var(--color-text-muted);
}

.history-meta,
.secondary-text,
.movement-label,
.mobile-meta {
  font-size: 13px;
  line-height: 20px;
}

.description-cell,
.mobile-description-button,
.mobile-description-static {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.description-text {
  overflow: hidden;
  color: var(--color-text);
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
}

.amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.income-amount {
  color: var(--color-financial-positive);
}

.expense-amount {
  color: var(--color-financial-negative);
}

.transfer-amount {
  color: var(--color-info);
}

.recurrence-source-tag {
  margin-left: 6px;
  vertical-align: middle;
}

.mobile-history {
  display: none;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mobile-item {
  display: grid;
  gap: 8px;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.mobile-item:first-child {
  border-top: 1px solid var(--color-border);
}

.mobile-primary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
}

.mobile-description-button {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.mobile-description-button:hover .description-text {
  color: var(--color-action-primary);
}

.mobile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mobile-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  color: var(--color-text-subtle);
  font-size: 13px;
}

.mobile-category {
  min-width: 0;
  overflow-wrap: anywhere;
}

.more {
  display: flex;
  justify-content: center;
}

@media (max-width: 767px) {
  .desktop-history {
    display: none;
  }

  .mobile-history {
    display: grid;
  }
}
</style>
