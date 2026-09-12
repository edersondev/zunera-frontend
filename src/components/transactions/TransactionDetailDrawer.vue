<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatTransactionAmount, formatTransactionDate } from '@/utils/transactions/transactionFormatters'
const props = defineProps({ modelValue: Boolean, transaction: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'edit', 'remove'])
const { t } = useI18n()
const title = computed(() => props.transaction?.description ?? t('transactions.transaction'))
</script>
<template>
  <ElDrawer :model-value="modelValue" :title="title" size="min(92vw, 480px)" @update:model-value="emit('update:modelValue', $event)">
    <ElDescriptions v-if="transaction" :column="1" border>
      <ElDescriptionsItem :label="t('transactions.amount')">{{ formatTransactionAmount(transaction) }}</ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transactions.date')">{{ formatTransactionDate(transaction.transaction_date) }}</ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transactions.account')">{{ transaction.financial_account.name }}</ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transactions.category')">{{ transaction.category.name }}</ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transactions.status')">{{ t(`transactions.${transaction.status}`) }}</ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transactions.notes')">{{ transaction.notes || t('transactions.noNotes') }}</ElDescriptionsItem>
    </ElDescriptions>
    <template #footer>
      <ElButton @click="emit('edit', transaction)">{{ t('transactions.edit') }}</ElButton>
      <ElButton type="danger" @click="emit('remove', transaction)">{{ t('transactions.remove') }}</ElButton>
    </template>
  </ElDrawer>
</template>
