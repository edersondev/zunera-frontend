<script setup>
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatTransactionAmount, formatTransactionDate } from '@/utils/transactions/transactionFormatters'
import { sourceLabel } from '@/utils/recurring-transactions/recurringTransactionFormatters'
import {
  accountLabel,
  formatTransferAmount,
  formatTransferDate,
} from '@/utils/transfers/transferFormatters'
const props = defineProps({ modelValue: Boolean, transaction: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'edit', 'remove', 'view-rule'])
const { t } = useI18n()
const title = computed(() => props.transaction?.description ?? t('transactions.transaction'))
const isTransfer = computed(() => props.transaction?.movement_kind === 'transfer')
const recurrenceSource = computed(() =>
  isTransfer.value ? null : (props.transaction?.recurrence_source ?? null),
)
const recurrenceLabel = computed(() => sourceLabel(recurrenceSource.value, t))
const movementDate = computed(
  () => props.transaction?.movement_date ?? props.transaction?.transaction_date,
)
</script>
<template>
  <ElDrawer :model-value="modelValue" :title="title" size="min(92vw, 480px)" @update:model-value="emit('update:modelValue', $event)">
    <ElDescriptions v-if="transaction" :column="1" border>
      <ElDescriptionsItem :label="isTransfer ? t('transfers.transfer') : t('transactions.amount')">
        {{ isTransfer ? formatTransferAmount(transaction) : formatTransactionAmount(transaction) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transactions.date')">
        {{ isTransfer ? formatTransferDate(movementDate) : formatTransactionDate(movementDate) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem v-if="isTransfer" :label="t('transfers.source')">
        {{ accountLabel(transaction.source_financial_account, t) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem v-if="isTransfer" :label="t('transfers.destination')">
        {{ accountLabel(transaction.destination_financial_account, t) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem v-if="!isTransfer" :label="t('transactions.account')">{{
        transaction.financial_account.name
      }}</ElDescriptionsItem>
      <ElDescriptionsItem v-if="!isTransfer" :label="t('transactions.category')">{{
        transaction.category.name
      }}</ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transactions.status')">{{ t(`transactions.${transaction.status}`) }}</ElDescriptionsItem>
      <ElDescriptionsItem v-if="recurrenceLabel" :label="t('recurringTransactions.sourceRule')">
        <span data-test="transaction-recurrence-source">{{ recurrenceLabel }}</span>
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transactions.notes')">{{ transaction.notes || t('transactions.noNotes') }}</ElDescriptionsItem>
    </ElDescriptions>
    <p v-if="recurrenceLabel" class="hint" data-test="transaction-recurrence-scope">
      {{ t('recurringTransactions.oneOccurrenceScope') }}
    </p>
    <template #footer>
      <ElButton v-if="recurrenceSource" data-test="view-recurrence-rule" @click="emit('view-rule', recurrenceSource.id)">
        {{ t('recurringTransactions.viewRule') }}
      </ElButton>
      <ElButton v-if="!isTransfer" data-test="edit-transaction" @click="emit('edit', transaction)">{{ t('transactions.edit') }}</ElButton>
      <ElButton v-if="!isTransfer" type="danger" data-test="remove-transaction" @click="emit('remove', transaction)">{{ t('transactions.remove') }}</ElButton>
      <ElButton
        v-else
        :icon="Close"
        type="danger"
        data-test="close-transfer-detail"
        @click="emit('update:modelValue', false)"
      >
        {{ t('transfers.cancel') }}
      </ElButton>
    </template>
  </ElDrawer>
</template>
