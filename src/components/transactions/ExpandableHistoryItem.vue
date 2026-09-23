<script setup>
import { computed } from 'vue'
import { ArrowDown, Refresh, Switch, Tickets } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { CATEGORY_ICON_COMPONENTS, categoryColorStyle } from '@/utils/categories/categoryOptions'
import { formatTransactionAmount, formatTransactionDate } from '@/utils/transactions/transactionFormatters'
import { accountLabel, formatTransferAmount, formatTransferRoute } from '@/utils/transfers/transferFormatters'
import { sourceLabel } from '@/utils/recurring-transactions/recurringTransactionFormatters'
import TransactionRowActions from './TransactionRowActions.vue'
import TransactionStatusBadge from './TransactionStatusBadge.vue'
import TransferRowActions from '@/components/transfers/TransferRowActions.vue'

const props = defineProps({
  row: { type: Object, required: true },
  categoryDefinition: { type: Object, default: null },
  expanded: Boolean,
  transactionSaving: Boolean,
  transferSaving: Boolean,
})
const emit = defineEmits(['toggle', 'select', 'edit-transaction', 'edit-transfer', 'update-transaction-status', 'update-transfer-status', 'remove-transaction', 'remove-transfer'])
const { t } = useI18n()
const kind = computed(() => props.row.movement_kind ?? props.row.type ?? 'expense')
const key = computed(() => `${kind.value}-${props.row.id}`)
const headerId = computed(() => `history-header-${key.value}`)
const detailId = computed(() => `history-details-${key.value}`)
const isTransfer = computed(() => kind.value === 'transfer')
const isCard = computed(() => kind.value === 'credit_card_expense')
const isRecurring = computed(() => kind.value === 'recurring')
const isOrdinary = computed(() => kind.value === 'income' || kind.value === 'expense')
const icon = computed(() => isTransfer.value ? Switch : isRecurring.value ? Refresh : CATEGORY_ICON_COMPONENTS[props.categoryDefinition?.icon] ?? Tickets)
const iconStyle = computed(() => props.categoryDefinition?.color ? categoryColorStyle(props.categoryDefinition.color) : undefined)
const label = computed(() => props.row.description || (isTransfer.value ? t('transfers.transfer') : t('transactions.transaction')))
const account = computed(() => {
  if (isTransfer.value) return formatTransferRoute(props.row, t)
  if (isCard.value) return props.row.credit_card?.name ?? ''
  return accountLabel(props.row.financial_account, t)
})
const category = computed(() => {
  if (isTransfer.value || !props.row.category?.name) return ''
  return `${props.row.category.name}${props.row.category.status === 'archived' ? ` (${t('transactions.archived')})` : ''}`
})
const date = computed(() => formatTransactionDate(props.row.movement_date ?? props.row.transaction_date))
const amount = computed(() => isTransfer.value ? formatTransferAmount(props.row) : formatTransactionAmount({ ...props.row, type: isCard.value ? 'expense' : props.row.type ?? kind.value }))
const tone = computed(() => isTransfer.value ? 'transfer' : (isCard.value || props.row.type === 'expense' || kind.value === 'expense') ? 'expense' : 'income')
const typeLabel = computed(() => isTransfer.value ? t('transactions.transfer') : isCard.value ? t('creditCards.history.recognizedExpense') : isRecurring.value ? t('transactions.recurring') : t(`transactions.${kind.value}`))
const recurrence = computed(() => sourceLabel(props.row.recurrence_source, t))
</script>

<template>
  <li class="history-item" :class="{ 'is-expanded': expanded }" :data-test="`history-item-${key}`">
    <button
      :id="headerId"
      type="button"
      class="history-toggle"
      :aria-expanded="expanded"
      :aria-controls="detailId"
      :data-test="`history-toggle-${key}`"
      @click="emit('toggle', key)"
    >
      <span class="history-icon" :class="`tone-${tone}`" :style="iconStyle" aria-hidden="true"><ElIcon :size="18"><component :is="icon" /></ElIcon></span>
      <span class="history-copy">
        <strong class="history-description">{{ label }}</strong>
        <span class="history-meta">
          <span v-if="category">{{ category }}</span>
          <span v-if="category && account" aria-hidden="true">·</span>
          <span v-if="account" :data-test="isTransfer ? 'transfer-history-route' : isCard ? 'credit-card-history-card' : undefined">{{ account }}</span>
          <span v-if="isTransfer || isCard" class="movement-label" :data-test="isCard ? 'credit-card-history-label' : undefined">{{ typeLabel }}</span>
          <span>{{ date }}</span>
          <span v-if="isCard && row.installment?.sequence != null && row.installment.total_count != null">{{ row.installment.sequence }}/{{ row.installment.total_count }}</span>
          <span v-if="recurrence" class="recurrence-label" :aria-label="recurrence" data-test="transaction-recurrence-label"><ElIcon><Refresh /></ElIcon> {{ recurrence }}</span>
          <span v-if="isRecurring" class="recurrence-label"><ElIcon><Refresh /></ElIcon> {{ t('transactions.recurring') }}</span>
        </span>
      </span>
      <span class="history-value">
        <strong class="history-amount" :class="`amount-${tone}`" :data-test="isTransfer ? 'transfer-history-amount' : 'transaction-history-amount'">{{ amount }}</strong>
        <TransactionStatusBadge v-if="row.status" :status="row.status" />
        <span v-else-if="isRecurring" class="history-kind">{{ typeLabel }}</span>
      </span>
      <ElIcon class="history-chevron" :class="{ 'is-rotated': expanded }" aria-hidden="true"><ArrowDown /></ElIcon>
    </button>

    <div v-show="expanded" :id="detailId" class="history-details" role="region" :aria-labelledby="headerId" :data-test="`history-details-${key}`">
      <h3>{{ t('transactions.details') }}</h3>
      <dl class="detail-grid">
        <div class="detail-pair"><dt>{{ t('transactions.descriptionField') }}</dt><dd>{{ label }}</dd></div>
        <div class="detail-pair"><dt>{{ t('transactions.type') }}</dt><dd>{{ typeLabel }}</dd></div>
        <div v-if="category" class="detail-pair"><dt>{{ t('transactions.category') }}</dt><dd>{{ category }}</dd></div>
        <div v-if="isTransfer && row.source_financial_account?.name" class="detail-pair"><dt>{{ t('transfers.source') }}</dt><dd>{{ accountLabel(row.source_financial_account, t) }}</dd></div>
        <div v-if="isTransfer && row.destination_financial_account?.name" class="detail-pair"><dt>{{ t('transfers.destination') }}</dt><dd>{{ accountLabel(row.destination_financial_account, t) }}</dd></div>
        <div v-if="!isTransfer && account" class="detail-pair"><dt>{{ isCard ? t('creditCards.statementDetail.creditCard') : t('transactions.account') }}</dt><dd>{{ account }}</dd></div>
        <div class="detail-pair"><dt>{{ isCard ? t('creditCards.statement.closing') : isRecurring ? t('recurringTransactions.nextExpected') : t('transactions.date') }}</dt><dd>{{ date }}</dd></div>
        <div v-if="isCard && row.statement?.due_date" class="detail-pair"><dt>{{ t('transactions.dueDate') }}</dt><dd>{{ formatTransactionDate(row.statement.due_date) }}</dd></div>
        <div v-if="isCard && row.installment?.sequence != null && row.installment.total_count != null" class="detail-pair"><dt>{{ t('creditCards.statementDetail.installment') }}</dt><dd>{{ row.installment.sequence }}/{{ row.installment.total_count }}</dd></div>
        <div class="detail-pair"><dt>{{ t('transactions.amount') }}</dt><dd class="detail-money">{{ amount }}</dd></div>
        <div v-if="row.status" class="detail-pair"><dt>{{ t('transactions.status') }}</dt><dd>{{ t(`transactions.${row.status}`) }}</dd></div>
        <div v-if="isRecurring && row.state" class="detail-pair"><dt>{{ t('recurringTransactions.criteria.state') }}</dt><dd>{{ t(`recurringTransactions.${row.state}`) }}</dd></div>
        <div v-if="row.notes" class="detail-pair"><dt>{{ t('transactions.notes') }}</dt><dd>{{ row.notes }}</dd></div>
        <div v-if="recurrence" class="detail-pair"><dt>{{ t('recurringTransactions.sourceRule') }}</dt><dd>{{ recurrence }}</dd></div>
        <div v-if="isRecurring && row.frequency" class="detail-pair"><dt>{{ t('transactions.frequency') }}</dt><dd>{{ t(`recurringTransactions.frequencies.${row.frequency}`) }}</dd></div>
      </dl>
      <div v-if="isOrdinary || isTransfer" class="detail-actions" @click.stop>
        <ElButton size="small" data-test="view-history-details" @click.stop="emit('select', row)">{{ t('transactions.viewDetails') }}</ElButton>
        <TransactionRowActions v-if="isOrdinary" :transaction="row" :saving="transactionSaving" @edit="emit('edit-transaction', $event)" @update-status="(transaction, status) => emit('update-transaction-status', transaction, status)" @remove="emit('remove-transaction', $event)" />
        <TransferRowActions v-else :transfer="row" :saving="transferSaving" @edit="emit('edit-transfer', $event)" @update-status="(transfer, status) => emit('update-transfer-status', transfer, status)" @remove="emit('remove-transfer', $event)" />
      </div>
    </div>
  </li>
</template>

<style scoped>
.history-item { min-width: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); overflow: hidden; }
.history-item.is-expanded { border-color: var(--color-border-strong); }
.history-toggle { display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(0, auto) auto; gap: 12px; align-items: center; width: 100%; min-height: 56px; padding: 10px 12px; border: 0; background: transparent; color: var(--color-text); font: inherit; text-align: left; cursor: pointer; }
.history-toggle:hover, .is-expanded .history-toggle { background: var(--color-surface-secondary); }
.history-toggle:focus-visible { outline: 2px solid var(--color-action-primary); outline-offset: -2px; }
.history-icon { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: var(--radius-md); background: var(--color-surface-secondary); }
.tone-income { color: var(--color-financial-positive); }.tone-expense { color: var(--color-financial-negative); }.tone-transfer { color: var(--color-info); }
.history-copy, .history-value { display: grid; min-width: 0; gap: 2px; }
.history-description { overflow-wrap: anywhere; font-size: 14px; line-height: 20px; }
.history-meta { display: flex; flex-wrap: wrap; gap: 2px 6px; color: var(--color-text-muted); font-size: 12px; line-height: 16px; overflow-wrap: anywhere; }
.recurrence-label { display: inline-flex; align-items: center; gap: 2px; }
.history-value { justify-items: end; text-align: right; }
.history-amount { font-size: 14px; line-height: 20px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.amount-income { color: var(--color-financial-positive); }.amount-expense { color: var(--color-financial-negative); }.amount-transfer { color: var(--color-info); }
.history-kind { color: var(--color-text-muted); font-size: 12px; }
.history-chevron { color: var(--color-text-muted); transition: transform 160ms ease; }.history-chevron.is-rotated { transform: rotate(180deg); }
.history-details { padding: 12px 16px 16px; border-top: 1px solid var(--color-border); background: var(--color-surface-secondary); }
.history-details h3 { margin: 0 0 12px; font-size: 14px; line-height: 20px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; margin: 0; }
.detail-pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 12px; font-size: 13px; line-height: 20px; }
.detail-pair dt { color: var(--color-text-muted); }.detail-pair dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }.detail-money { font-variant-numeric: tabular-nums; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); }
@media (max-width: 639px) { .history-toggle { grid-template-columns: auto minmax(0, 1fr) minmax(0, 42%) auto; gap: 8px; }.history-meta { grid-column: 1 / -1; }.detail-grid, .detail-pair { grid-template-columns: 1fr; }.detail-pair { gap: 0; } }
@media (max-width: 359px) { .history-toggle { grid-template-columns: auto minmax(0, 1fr) auto; }.history-value { grid-column: 2 / -1; grid-row: 2; justify-items: start; text-align: left; } }
@media (prefers-reduced-motion: reduce) { .history-chevron { transition: none; } }
</style>
