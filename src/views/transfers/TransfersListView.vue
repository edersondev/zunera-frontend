<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { Delete, Plus, Refresh } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import TransferFormDialog from '@/components/transfers/TransferFormDialog.vue'
import TransferFilterBar from '@/components/transfers/TransferFilterBar.vue'
import TransferDetailDrawer from '@/components/transfers/TransferDetailDrawer.vue'
import TransferLifecycleConfirmDialog from '@/components/transfers/TransferLifecycleConfirmDialog.vue'
import TransferRowActions from '@/components/transfers/TransferRowActions.vue'
import { useTransferStore } from '@/stores/transfers/transferStore'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'
import {
  accountLabel,
  formatCentavos,
  formatTransferAmount,
  formatTransferDate,
} from '@/utils/transfers/transferFormatters'

const store = useTransferStore()
const accounts = useFinancialAccountStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const dialog = shallowRef(false)
const detailOpen = shallowRef(false)
const editing = shallowRef(null)
const confirmDialog = shallowRef(false)
const confirmAction = shallowRef('remove')
const pending = shallowRef(null)

const criteriaLabels = computed(() => ({
  q: t('transfers.criteria.q'),
  status: t('transfers.criteria.status'),
  source_financial_account_id: t('transfers.criteria.source_financial_account_id'),
  destination_financial_account_id: t('transfers.criteria.destination_financial_account_id'),
  from: t('transfers.criteria.from'),
  to: t('transfers.criteria.to'),
}))
const activeCriteria = computed(() =>
  Object.entries(store.filters)
    .filter(
      ([key, value]) =>
        Object.hasOwn(criteriaLabels.value, key) && value !== undefined && value !== null && value !== '',
    )
    .map(([key, value]) => `${criteriaLabels.value[key]}: ${value}`),
)
const hasFilters = computed(() => activeCriteria.value.length > 0)

function impactMessage(impact) {
  const sign = impact.delta > 0 ? '+ ' : '− '

  return `${impact.name}: ${formatCentavos(impact.after)} (${sign}${formatCentavos(Math.abs(impact.delta))})`
}

onMounted(() => {
  const query = {
    ...route.query,
    per_page: Number(route.query.per_page ?? 50),
    view: route.query.view ?? 'active',
  }

  return Promise.all([store.setFilters(query), accounts.fetchAccounts()]).catch(() => {})
})

async function reload() {
  try {
    await store.setFilters(store.filters)
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function save(payload) {
  try {
    if (editing.value) await store.update(editing.value.id, payload)
    else await store.create(payload)
    dialog.value = false
    editing.value = null
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function openDetail(row) {
  await store.select(row.id)
  detailOpen.value = true
}

function edit(transfer) {
  detailOpen.value = false
  editing.value = transfer
  dialog.value = true
}

function requestLifecycle(transfer, action) {
  pending.value = transfer
  confirmAction.value = action
  confirmDialog.value = true
}

async function updateStatus(transfer, status) {
  try {
    await store.update(transfer.id, { status })
  } catch {
    /* Feedback comes from the store error state. */
  }
}

async function confirmLifecycle() {
  try {
    if (confirmAction.value === 'restore') await store.restore(pending.value.id, {})
    else await store.remove(pending.value.id)
    detailOpen.value = false
  } catch {
    /* Feedback comes from the store error state. */
  } finally {
    confirmDialog.value = false
    pending.value = null
  }
}

async function applyFilters(filters) {
  const query = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
  await router.replace({ query })

  return store.setFilters(filters)
}

const clearedFilters = {
  view: 'active',
  per_page: 50,
  q: undefined,
  status: undefined,
  source_financial_account_id: undefined,
  destination_financial_account_id: undefined,
  from: undefined,
  to: undefined,
}
</script>

<template>
  <div>
    <PageHeader :title="t('transfers.title')" :description="t('transfers.description')">
      <template #actions>
        <ElButton type="primary" :icon="Plus" data-test="new-transfer" @click="dialog = true">
          {{ t('transfers.new') }}
        </ElButton>
        <ElButton
          type="info"
          :icon="Delete"
          data-test="open-removed-transfers"
          @click="router.push({ name: 'transfers-removed' })"
        >
          {{ t('transfers.removed') }}
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
    >
      <ElButton :icon="Refresh" data-test="transfer-retry" @click="reload">
        {{ t('transfers.retry') }}
      </ElButton>
    </ElAlert>
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
      :title="t('transfers.balanceUpdated', { impact: impactMessage(impact) })"
      class="feedback"
      data-test="balance-impact"
    />
    <TransferFilterBar
      :filters="store.filters"
      :accounts="accounts.accounts"
      :loading="store.loading"
      @apply="applyFilters"
      @clear="applyFilters(clearedFilters)"
    />
    <p v-if="hasFilters" class="criteria" data-test="active-criteria">
      {{ t('transfers.activeCriteria') }}: {{ activeCriteria.join(' · ') }}
    </p>
    <section aria-labelledby="transfers-title">
      <h2 id="transfers-title" data-test="transfer-count">
        {{ t('transfers.count', { count: store.meta.total ?? 0 }) }}
      </h2>
      <ElTable
        v-loading="store.loading"
        :data="store.items"
        row-key="id"
        data-test="transfer-table"
        @row-click="openDetail"
      >
        <ElTableColumn :label="t('transfers.columns.description')" min-width="180">
          <template #default="{ row }">
            <span class="transfer-label" data-test="transfer-row-label">
              {{ t('transfers.transfer') }}
            </span>
            <span class="transfer-route" data-test="transfer-row-route">
              {{ accountLabel(row.source_financial_account, t) }} →
              {{ accountLabel(row.destination_financial_account, t) }}
            </span>
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
          <template #default="{ row }">
            <span class="transfer-amount" data-test="transfer-row-amount">
              {{ formatTransferAmount(row) }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transfers.columns.status')" min-width="110">
          <template #default="{ row }">
            <ElTag :type="row.status === 'pending' ? 'warning' : undefined">
              {{ t(`transfers.${row.status}`) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn width="64" align="center">
          <template #default="{ row }">
            <TransferRowActions
              :transfer="row"
              :saving="store.saving"
              @edit="edit"
              @update-status="updateStatus"
              @remove="requestLifecycle($event, 'remove')"
            />
          </template>
        </ElTableColumn>
      </ElTable>
    </section>
    <ElEmpty
      v-if="!store.loading && !store.error && store.items.length === 0"
      :description="hasFilters ? t('transfers.noMatch') : t('transfers.empty')"
      :data-test="hasFilters ? 'transfer-no-match' : 'transfer-empty'"
    />
    <div class="more">
      <ElButton v-if="store.hasMore" :loading="store.loading" data-test="load-more" @click="store.loadMore">
        {{ t('transfers.loadMore') }}
      </ElButton>
    </div>
    <TransferFormDialog
      v-model="dialog"
      :transfer="editing"
      :accounts="accounts.accounts"
      :saving="store.saving"
      :errors="store.validationErrors"
      @submit="save"
    />
    <TransferDetailDrawer
      v-model="detailOpen"
      :transfer="store.selected"
      @edit="edit"
      @remove="requestLifecycle($event, 'remove')"
    />
    <TransferLifecycleConfirmDialog
      v-model:visible="confirmDialog"
      :transfer="pending"
      :action="confirmAction"
      :loading="store.saving"
      @confirm="confirmLifecycle"
    />
  </div>
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
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
.transfer-label {
  display: block;
  font-weight: 600;
}
.transfer-route {
  display: block;
  font-variant-numeric: tabular-nums;
}
.transfer-description {
  color: var(--color-text-muted, #666);
  display: block;
  font-size: 13px;
}
.transfer-amount {
  font-variant-numeric: tabular-nums;
}
.more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
