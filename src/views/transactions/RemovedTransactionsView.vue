<script setup>
import { onMounted, shallowRef } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useTransactionStore } from '@/stores/transactions/transactionStore'
import { formatTransactionAmount, formatTransactionDate } from '@/utils/transactions/transactionFormatters'

const store = useTransactionStore()
const feedback = shallowRef(null)

onMounted(() => store.setFilters({ view: 'removed' }).catch(() => {}))

async function restore(id) {
  try {
    await store.restore(id, {})
    feedback.value = 'Transação restaurada.'
  } catch (error) {
    feedback.value = error?.message ?? 'Não foi possível restaurar a transação.'
  }
}
</script>

<template>
  <div>
    <PageHeader title="Transações removidas" description="Restaure transações removidas quando necessário." />
    <ElAlert v-if="store.error" type="error" show-icon :title="store.error.message" class="feedback" data-test="removed-error" />
    <ElAlert v-if="feedback" type="success" show-icon :title="feedback" class="feedback" data-test="removed-feedback" />
    <ElTable v-loading="store.loading" :data="store.items" data-test="removed-table">
      <ElTableColumn prop="description" label="Descrição" />
      <ElTableColumn label="Valor">
        <template #default="{ row }">{{ formatTransactionAmount(row) }}</template>
      </ElTableColumn>
      <ElTableColumn label="Data">
        <template #default="{ row }">{{ formatTransactionDate(row.transaction_date) }}</template>
      </ElTableColumn>
      <ElTableColumn label="">
        <template #default="{ row }">
          <ElButton data-test="restore-transaction" @click="restore(row.id)">Restaurar</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <ElEmpty
      v-if="!store.loading && store.items.length === 0"
      description="Nenhuma transação removida."
      data-test="removed-empty"
    />
  </div>
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
}
</style>
