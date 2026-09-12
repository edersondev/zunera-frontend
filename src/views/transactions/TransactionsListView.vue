<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import TransactionFormDialog from '@/components/transactions/TransactionFormDialog.vue'
import TransactionFilterBar from '@/components/transactions/TransactionFilterBar.vue'
import TransactionDetailDrawer from '@/components/transactions/TransactionDetailDrawer.vue'
import { useTransactionStore } from '@/stores/transactions/transactionStore'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'
import { useCategoryStore } from '@/stores/categories/categoryStore'
import {
  formatTransactionAmount,
  formatTransactionDate,
} from '@/utils/transactions/transactionFormatters'

const store = useTransactionStore()
const accounts = useFinancialAccountStore()
const categories = useCategoryStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const dialog = shallowRef(false)
const detailOpen = shallowRef(false)
const editing = shallowRef(null)

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
        Object.hasOwn(criteriaLabels.value, key) && value !== undefined && value !== null && value !== '',
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

onMounted(() => {
  const query = {
    ...route.query,
    per_page: Number(route.query.per_page ?? 50),
    view: route.query.view ?? 'active',
  }

  return Promise.all([
    store.setFilters(query),
    accounts.fetchAccounts(),
    categories.fetchCategories('active'),
  ]).catch(() => {})
})

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

function edit(transaction) {
  detailOpen.value = false
  editing.value = transaction
  dialog.value = true
}

async function remove(transaction) {
  try {
    await ElMessageBox.confirm(t('transactions.removeConfirmation', { description: transaction.description }), t('transactions.removeTitle'), {
      type: 'warning',
    })
    await store.remove(transaction.id)
    detailOpen.value = false
  } catch {
    /* Cancelled or failed removal keeps the current view. */
  }
}

async function applyFilters(filters) {
  const query = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )
  await router.replace({ query })

  return store.setFilters(filters)
}

const clearedFilters = {
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
        <ElButton type="primary" :icon="Plus" data-test="new-transaction" @click="dialog = true"
          >{{ t('transactions.new') }}</ElButton
        >
        <ElButton
          type="info"
          :icon="Delete"
          data-test="open-removed-transactions"
          @click="router.push({ name: 'transactions-removed' })"
        >
          {{ t('transactions.removed') }}
        </ElButton>
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
      v-if="store.notice"
      type="warning"
      show-icon
      :title="store.notice.message"
      class="feedback"
      data-test="transaction-notice"
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
    <section aria-labelledby="transactions-title">
      <h2 id="transactions-title" data-test="transaction-count">
        {{ t('transactions.count', { count: store.meta.total ?? 0 }) }}
      </h2>
      <ElTable
        v-loading="store.loading"
        :data="store.items"
        row-key="id"
        data-test="transaction-table"
        @row-click="openDetail"
      >
        <ElTableColumn :label="t('transactions.columns.description')" prop="description" min-width="180" />
        <ElTableColumn :label="t('transactions.columns.date')" min-width="130">
          <template #default="{ row }">{{ formatTransactionDate(row.transaction_date) }}</template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.account')" min-width="150">
          <template #default="{ row }">
            {{ row.financial_account.name
            }}<span v-if="row.financial_account.status === 'archived'"> ({{ t('transactions.archived') }})</span>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.category')" min-width="150">
          <template #default="{ row }">
            {{ row.category.name
            }}<span v-if="row.category.status === 'archived'"> ({{ t('transactions.archived') }})</span>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.amount')" min-width="180">
          <template #default="{ row }">
            <span :class="row.type === 'income' ? 'income' : 'expense'">
              {{ formatTransactionAmount(row) }} ·
              {{ row.type === 'income' ? t('transactions.income') : t('transactions.expense') }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('transactions.columns.status')" min-width="110">
          <template #default="{ row }"
            ><ElTag>{{ t(`transactions.${row.status}`) }}</ElTag></template
          >
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
      v-model="dialog"
      :transaction="editing"
      :accounts="accounts.accounts"
      :categories="categories.categories"
      :saving="store.saving"
      :errors="store.validationErrors"
      @submit="save"
    />
    <TransactionDetailDrawer
      v-model="detailOpen"
      :transaction="store.selected"
      @edit="edit"
      @remove="remove"
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
.income {
  color: var(--color-financial-positive);
  font-variant-numeric: tabular-nums;
}
.expense {
  color: var(--color-financial-negative);
  font-variant-numeric: tabular-nums;
}
.more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
