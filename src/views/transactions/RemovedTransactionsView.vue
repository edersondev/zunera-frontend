<script setup>
import { onMounted, shallowRef } from 'vue'
import { Money } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import { showActionSuccess } from '@/services/actionMessage'
import { useTransactionStore } from '@/stores/transactions/transactionStore'
import { formatTransactionAmount, formatTransactionDate } from '@/utils/transactions/transactionFormatters'
import { formatTransferAmount, formatTransferLabel } from '@/utils/transfers/transferFormatters'

const store = useTransactionStore()
const router = useRouter()
const { t } = useI18n()
const restoreError = shallowRef('')

onMounted(() => store.setFilters({ view: 'removed' }).catch(() => {}))

function isTransfer(entry) {
  return entry.movement_kind === 'transfer'
}

function movementLabel(entry) {
  return isTransfer(entry) ? formatTransferLabel(entry, t) : entry.description
}

function movementAmount(entry) {
  return isTransfer(entry) ? formatTransferAmount(entry) : formatTransactionAmount(entry)
}

async function restore(entry) {
  restoreError.value = ''
  try {
    await store.restoreHistoryEntry(entry, {})
    showActionSuccess(isTransfer(entry) ? t('transfers.restored') : t('transactions.restoreSuccess'))
  } catch (error) {
    if (!store.error) restoreError.value = error?.message ?? (isTransfer(entry) ? t('transfers.restoreFailed') : t('transactions.restoreFailed'))
  }
}
</script>

<template>
  <div>
    <PageHeader :title="t('transactions.removed')" :description="t('transactions.removedDescription')">
      <template #actions>
        <ElButton :icon="Money" data-test="back-to-transactions" @click="router.push({ name: 'transactions' })">
          {{ t('transactions.back') }}
        </ElButton>
      </template>
    </PageHeader>
    <ElAlert v-if="store.error" type="error" show-icon :title="store.error.message" class="feedback" data-test="removed-error" />
    <ElAlert v-if="restoreError" type="error" show-icon :title="restoreError" class="feedback" data-test="restore-error" />
    <ElTable v-loading="store.loading" :data="store.items" data-test="removed-table">
      <ElTableColumn :label="t('transactions.columns.description')">
        <template #default="{ row }">{{ movementLabel(row) }}</template>
      </ElTableColumn>
      <ElTableColumn :label="t('transactions.columns.amount')">
        <template #default="{ row }">{{ movementAmount(row) }}</template>
      </ElTableColumn>
      <ElTableColumn :label="t('transactions.columns.date')">
        <template #default="{ row }">{{ formatTransactionDate(row.movement_date ?? row.transaction_date) }}</template>
      </ElTableColumn>
      <ElTableColumn label="">
        <template #default="{ row }">
          <ElButton :data-test="isTransfer(row) ? 'restore-transfer' : 'restore-transaction'" @click="restore(row)">
            {{ t('transactions.restore') }}
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <ElEmpty
      v-if="!store.loading && store.items.length === 0"
      :description="t('transactions.removedEmpty')"
      data-test="removed-empty"
    />
  </div>
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
}
</style>
