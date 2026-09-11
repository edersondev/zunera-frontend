<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
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
const dialog = shallowRef(false)
const detailOpen = shallowRef(false)
const editing = shallowRef(null)

const criteriaLabels = {
  q: 'Busca',
  type: 'Tipo',
  status: 'Status',
  financial_account_id: 'Conta',
  category_id: 'Categoria',
  from: 'De',
  to: 'Até',
}
const activeCriteria = computed(() =>
  Object.entries(store.filters)
    .filter(
      ([key, value]) =>
        Object.hasOwn(criteriaLabels, key) && value !== undefined && value !== null && value !== '',
    )
    .map(([key, value]) => `${criteriaLabels[key]}: ${value}`),
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
    await ElMessageBox.confirm(`Remover “${transaction.description}”?`, 'Remover transação', {
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
    <PageHeader title="Transações" description="Registre e acompanhe suas receitas e despesas.">
      <template #actions>
        <ElButton data-test="open-removed-transactions" @click="router.push({ name: 'transactions-removed' })">
          Transações removidas
        </ElButton>
        <ElButton type="primary" :icon="Plus" data-test="new-transaction" @click="dialog = true">Nova transação</ElButton>
      </template>
    </PageHeader>
    <ElAlert v-if="store.error" type="error" show-icon :title="store.error.message" class="feedback" data-test="transaction-error" />
    <ElAlert v-if="store.notice" type="warning" show-icon :title="store.notice.message" class="feedback" data-test="transaction-notice" />
    <ElAlert
      v-for="impact in store.lastBalanceImpact ?? []"
      :key="impact.id"
      type="success"
      show-icon
      :title="`Saldo atualizado — ${impactMessage(impact)}`"
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
      Critérios ativos: {{ activeCriteria.join(' · ') }}
    </p>
    <section aria-labelledby="transactions-title">
      <h2 id="transactions-title" data-test="transaction-count">{{ store.meta.total ?? 0 }} transações</h2>
      <ElTable v-loading="store.loading" :data="store.items" row-key="id" data-test="transaction-table" @row-click="openDetail">
        <ElTableColumn label="Descrição" prop="description" min-width="180" />
        <ElTableColumn label="Data" min-width="130">
          <template #default="{ row }">{{ formatTransactionDate(row.transaction_date) }}</template>
        </ElTableColumn>
        <ElTableColumn label="Conta" min-width="150">
          <template #default="{ row }">
            {{ row.financial_account.name }}<span v-if="row.financial_account.status === 'archived'"> (arquivada)</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Categoria" min-width="150">
          <template #default="{ row }">
            {{ row.category.name }}<span v-if="row.category.status === 'archived'"> (arquivada)</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Valor" min-width="180">
          <template #default="{ row }">
            <span :class="row.type === 'income' ? 'income' : 'expense'">
              {{ formatTransactionAmount(row) }} · {{ row.type === 'income' ? 'Receita' : 'Despesa' }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Status" min-width="110">
          <template #default="{ row }"><ElTag>{{ row.status }}</ElTag></template>
        </ElTableColumn>
      </ElTable>
    </section>
    <ElEmpty
      v-if="!store.loading && store.items.length === 0"
      description="Nenhuma transação encontrada."
      data-test="transaction-empty"
    />
    <div class="more">
      <ElButton v-if="store.hasMore" :loading="store.loading" data-test="load-more" @click="store.loadMore">
        Carregar mais
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
