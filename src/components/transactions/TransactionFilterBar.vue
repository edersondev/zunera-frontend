<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { Close, Filter, Search } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatTransactionDate } from '@/utils/transactions/transactionFormatters'

const props = defineProps({
  filters: { type: Object, required: true },
  accounts: { type: Array, required: true },
  categories: { type: Array, required: true },
  loading: Boolean,
})
const emit = defineEmits(['apply', 'clear'])
const { t } = useI18n()
const dialogVisible = shallowRef(false)
const form = reactive(blankFilters(props.filters))

const dateRange = computed({
  get: () => (form.from || form.to ? [form.from, form.to] : undefined),
  set: (range) => {
    const [from, to] = Array.isArray(range) ? range : []

    form.from = from
    form.to = to
  },
})

const activeFilters = computed(() => {
  const filters = []

  if (hasValue(props.filters.q)) {
    filters.push({ key: 'q', label: t('transactions.criteria.q'), value: props.filters.q })
  }
  if (hasValue(props.filters.type)) {
    filters.push({
      key: 'type',
      label: t('transactions.criteria.type'),
      value: t(`transactions.${props.filters.type}`),
    })
  }
  if (hasValue(props.filters.status)) {
    filters.push({
      key: 'status',
      label: t('transactions.criteria.status'),
      value: t(`transactions.${props.filters.status}`),
    })
  }
  if (hasValue(props.filters.financial_account_id)) {
    filters.push({
      key: 'financial_account_id',
      label: t('transactions.criteria.financial_account_id'),
      value: optionLabel(props.accounts, props.filters.financial_account_id),
    })
  }
  if (hasValue(props.filters.category_id)) {
    filters.push({
      key: 'category_id',
      label: t('transactions.criteria.category_id'),
      value: optionLabel(props.categories, props.filters.category_id),
    })
  }
  if (hasValue(props.filters.from) || hasValue(props.filters.to)) {
    filters.push({
      key: 'period',
      label: t('transactions.period'),
      value: periodLabel(props.filters.from, props.filters.to),
    })
  }

  return filters
})

watch(
  () => props.filters,
  (filters) => Object.assign(form, blankFilters(filters)),
  { deep: true },
)

function blankFilters(filters = {}) {
  return {
    view: filters.view ?? 'active',
    per_page: filters.per_page ?? 50,
    q: filters.q,
    type: filters.type,
    status: filters.status,
    financial_account_id: filters.financial_account_id,
    category_id: filters.category_id,
    from: filters.from,
    to: filters.to,
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function optionLabel(options, id) {
  return options.find((option) => String(option.id) === String(id))?.name ?? String(id)
}

function periodLabel(from, to) {
  if (from && to) return `${formatTransactionDate(from)} – ${formatTransactionDate(to)}`
  if (from) return t('transactions.periodFrom', { date: formatTransactionDate(from) })

  return t('transactions.periodTo', { date: formatTransactionDate(to) })
}

function apply({ closeDialog = true } = {}) {
  emit('apply', { ...form })
  if (closeDialog) dialogVisible.value = false
}

function applySearch() {
  form.q = typeof form.q === 'string' ? form.q.trim() || undefined : form.q
  apply({ closeDialog: false })
}

function openDialog() {
  dialogVisible.value = true
}

function cancelDialog() {
  Object.assign(form, blankFilters(props.filters))
  dialogVisible.value = false
}

function clear() {
  Object.assign(form, blankFilters())
  dialogVisible.value = false
  emit('clear')
}

function removeFilter(key) {
  const next = blankFilters(props.filters)

  if (key === 'period') {
    next.from = undefined
    next.to = undefined
  } else {
    next[key] = undefined
  }

  Object.assign(form, next)
  emit('apply', { ...next })
}
</script>

<template>
  <section class="filter-bar" aria-labelledby="transaction-search-label">
    <span id="transaction-search-label" class="sr-only">{{ t('transactions.searchLabel') }}</span>
    <form class="search-row" data-test="transaction-search-form" @submit.prevent="applySearch">
      <ElInput
        v-model="form.q"
        clearable
        :placeholder="t('transactions.searchPlaceholder')"
        :aria-label="t('transactions.searchLabel')"
        data-test="filter-search"
      >
        <template #prefix>
          <ElIcon><Search /></ElIcon>
        </template>
      </ElInput>
      <ElButton native-type="submit" :icon="Search" :loading="loading" data-test="apply-search">
        {{ t('transactions.search') }}
      </ElButton>
      <ElButton :icon="Filter" data-test="open-filters" @click="openDialog">
        {{ t('transactions.filters') }}
      </ElButton>
    </form>

    <div v-if="activeFilters.length" class="active-filters" data-test="active-criteria">
      <span class="active-filters-label">{{ t('transactions.activeCriteria') }}</span>
      <ElTag
        v-for="filter in activeFilters"
        :key="filter.key"
        closable
        type="info"
        effect="plain"
        :aria-label="t('transactions.removeFilter', { filter: filter.label })"
        :data-test="`active-filter-${filter.key}`"
        @close="removeFilter(filter.key)"
      >
        {{ filter.label }}: {{ filter.value }}
      </ElTag>
      <ElButton link type="primary" data-test="clear-active-filters" @click="clear">
        {{ t('transactions.clearAll') }}
      </ElButton>
    </div>

    <ElDialog
      :model-value="dialogVisible"
      :title="t('transactions.filtersTitle')"
      width="min(92vw, 720px)"
      data-test="transaction-filter-dialog"
      @update:model-value="(visible) => (visible ? openDialog() : cancelDialog())"
    >
      <ElForm
        :model="form"
        label-position="top"
        class="filters"
        data-test="transaction-filters"
        @submit.prevent="apply"
      >
        <ElFormItem :label="t('transactions.searchLabel')" class="filter-span-full">
          <ElInput
            v-model="form.q"
            clearable
            :placeholder="t('transactions.searchPlaceholder')"
            data-test="dialog-filter-search"
          >
            <template #prefix>
              <ElIcon><Search /></ElIcon>
            </template>
          </ElInput>
        </ElFormItem>
        <ElFormItem :label="t('transactions.type')">
          <ElSelect v-model="form.type" clearable data-test="filter-type">
            <ElOption :label="t('transactions.income')" value="income" />
            <ElOption :label="t('transactions.expense')" value="expense" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('transactions.status')">
          <ElSelect v-model="form.status" clearable data-test="filter-status">
            <ElOption :label="t('transactions.effective')" value="effective" />
            <ElOption :label="t('transactions.pending')" value="pending" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('transactions.account')">
          <ElSelect v-model="form.financial_account_id" clearable data-test="filter-account">
            <ElOption
              v-for="account in accounts"
              :key="account.id"
              :label="account.name"
              :value="account.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('transactions.category')">
          <ElSelect v-model="form.category_id" clearable data-test="filter-category">
            <ElOption
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('transactions.period')" class="filter-span-full">
          <ElDatePicker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            :range-separator="t('transactions.criteria.to')"
            :start-placeholder="t('transactions.startDate')"
            :end-placeholder="t('transactions.endDate')"
            data-test="filter-date-range"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <div class="filter-actions">
          <ElButton type="danger" :icon="Close" data-test="cancel-filters" @click="cancelDialog">
            {{ t('transactions.cancel') }}
          </ElButton>
          <ElButton
            type="primary"
            :icon="Filter"
            :loading="loading"
            data-test="apply-filters"
            @click="apply"
          >
            {{ t('transactions.filter') }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </section>
</template>

<style scoped>
.filter-bar {
  display: grid;
  gap: 12px;
}

.search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.active-filters-label {
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
}

.filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.filter-span-full {
  grid-column: 1 / -1;
}

.filter-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-select),
:deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}

@media (max-width: 639px) {
  .search-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .search-row :deep(.el-button:first-of-type) {
    display: none;
  }

  .filters {
    grid-template-columns: 1fr;
  }

  .filter-span-full {
    grid-column: auto;
  }

  .filter-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .filter-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
