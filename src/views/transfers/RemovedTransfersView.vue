<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { Money, RefreshLeft } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import TransferLifecycleConfirmDialog from '@/components/transfers/TransferLifecycleConfirmDialog.vue'
import RemovedTransferCard from '@/components/transfers/RemovedTransferCard.vue'
import { useTransferStore } from '@/stores/transfers/transferStore'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'
import {
  accountLabel,
  formatTransferAmount,
  formatTransferDate,
} from '@/utils/transfers/transferFormatters'

const store = useTransferStore()
const accounts = useFinancialAccountStore()
const router = useRouter()
const { t } = useI18n()
const confirmDialog = shallowRef(false)
const pending = shallowRef(null)
const hasMoreCandidates = computed(() => store.hasMore)

onMounted(() =>
  Promise.all([
    store.setFilters({ view: 'removed', per_page: 50, q: undefined }),
    accounts.fetchAccounts(),
  ]).catch(() => {}),
)

function requestRestore(transfer) {
  pending.value = transfer
  confirmDialog.value = true
}

async function confirmRestore() {
  try {
    await store.restore(pending.value.id, {})
  } catch {
    /* Feedback comes from the store error state. */
  } finally {
    confirmDialog.value = false
    pending.value = null
  }
}
</script>

<template>
  <div>
    <PageHeader :title="t('transfers.removedTitle')" :description="t('transfers.removedDescription')">
      <template #actions>
        <ElButton :icon="Money" data-test="back-to-transactions" @click="router.push({ name: 'transactions' })">
          {{ t('transactions.back') }}
        </ElButton>
      </template>
    </PageHeader>
    <ElAlert
      v-if="store.error"
      type="error"
      show-icon
      :title="store.error.message"
      class="feedback"
      data-test="transfer-error"
    />
    <ElAlert
      v-if="store.notice"
      type="warning"
      show-icon
      :title="store.notice.message"
      class="feedback"
      data-test="transfer-notice"
    />
    <ElAlert
      v-for="impact in store.lastBalanceImpact ?? []"
      :key="impact.id"
      type="success"
      show-icon
      :title="t('transfers.balanceUpdated', { impact: impact.name })"
      class="feedback"
      data-test="balance-impact"
    />
    <h2 data-test="removed-transfer-count">
      {{ t('transfers.count', { count: store.meta.total ?? 0 }) }}
    </h2>
    <ElTable v-loading="store.loading" :data="store.items" row-key="id" data-test="removed-transfer-table">
      <ElTableColumn :label="t('transfers.columns.description')" min-width="180">
        <template #default="{ row }">
          <span class="transfer-label">{{ t('transfers.transfer') }}</span>
          <span v-if="row.description" class="transfer-description">{{ row.description }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('transfers.columns.date')" min-width="130">
        <template #default="{ row }">{{ formatTransferDate(row.transfer_date) }}</template>
      </ElTableColumn>
      <ElTableColumn :label="t('transfers.columns.source')" min-width="150">
        <template #default="{ row }">{{ accountLabel(row.source_financial_account, t) }}</template>
      </ElTableColumn>
      <ElTableColumn :label="t('transfers.columns.destination')" min-width="150">
        <template #default="{ row }">{{ accountLabel(row.destination_financial_account, t) }}</template>
      </ElTableColumn>
      <ElTableColumn :label="t('transfers.columns.amount')" min-width="140">
        <template #default="{ row }">{{ formatTransferAmount(row) }}</template>
      </ElTableColumn>
      <ElTableColumn width="140" align="center">
        <template #default="{ row }">
          <ElButton
            :icon="RefreshLeft"
            :loading="store.saving"
            data-test="restore-transfer"
            @click="requestRestore(row)"
          >
            {{ t('transfers.restore') }}
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <section v-loading="store.loading" class="removed-transfer-cards" :aria-label="t('transfers.removedTitle')">
      <RemovedTransferCard
        v-for="transfer in store.items"
        :key="transfer.id"
        :transfer="transfer"
        :saving="store.saving"
        @restore="requestRestore"
      />
    </section>
    <ElEmpty
      v-if="!store.loading && store.items.length === 0"
      :description="t('transfers.emptyRemoved')"
      data-test="removed-transfer-empty"
    />
    <div v-if="hasMoreCandidates" class="more">
      <ElButton :loading="store.loading" data-test="load-more" @click="store.loadMore">
        {{ t('transfers.loadMore') }}
      </ElButton>
    </div>
    <TransferLifecycleConfirmDialog
      v-model:visible="confirmDialog"
      :transfer="pending"
      action="restore"
      :loading="store.saving"
      @confirm="confirmRestore"
    />
  </div>
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
}
h2 {
  color: var(--color-text);
  font-size: 20px;
  margin: 0 0 12px;
}
.transfer-label {
  display: block;
  font-weight: 600;
}
.transfer-description {
  color: var(--color-text-muted, #666);
  display: block;
  font-size: 13px;
}
.more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.removed-transfer-cards {
  display: none;
}

@media (max-width: 639px) {
  [data-test='removed-transfer-table'] {
    display: none;
  }

  .removed-transfer-cards {
    display: grid;
    gap: 12px;
  }
}
</style>
