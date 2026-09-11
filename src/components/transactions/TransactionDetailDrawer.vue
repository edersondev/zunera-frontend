<script setup>
import { computed } from 'vue'
import { formatTransactionAmount, formatTransactionDate } from '@/utils/transactions/transactionFormatters'
const props = defineProps({ modelValue: Boolean, transaction: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'edit', 'remove'])
const title = computed(() => props.transaction?.description ?? 'Transação')
</script>
<template><ElDrawer :model-value="modelValue" :title="title" size="min(92vw, 480px)" @update:model-value="emit('update:modelValue', $event)"><ElDescriptions v-if="transaction" :column="1" border><ElDescriptionsItem label="Valor">{{ formatTransactionAmount(transaction) }}</ElDescriptionsItem><ElDescriptionsItem label="Data">{{ formatTransactionDate(transaction.transaction_date) }}</ElDescriptionsItem><ElDescriptionsItem label="Conta">{{ transaction.financial_account.name }}</ElDescriptionsItem><ElDescriptionsItem label="Categoria">{{ transaction.category.name }}</ElDescriptionsItem><ElDescriptionsItem label="Status">{{ transaction.status }}</ElDescriptionsItem><ElDescriptionsItem label="Observação">{{ transaction.notes || '—' }}</ElDescriptionsItem></ElDescriptions><template #footer><ElButton @click="emit('edit', transaction)">Editar</ElButton><ElButton type="danger" @click="emit('remove', transaction)">Remover</ElButton></template></ElDrawer></template>
