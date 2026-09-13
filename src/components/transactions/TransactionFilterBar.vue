<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { RefreshLeft, Search } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  filters: { type: Object, required: true },
  accounts: { type: Array, required: true },
  categories: { type: Array, required: true },
  loading: Boolean,
})
const emit = defineEmits(['apply', 'clear'])
const { t } = useI18n()
const form = reactive({ ...props.filters })
const activePanels = shallowRef([])
const dateRange = computed({
  get: () => (form.from || form.to ? [form.from, form.to] : undefined),
  set: (range) => {
    const [from, to] = Array.isArray(range) ? range : []

    form.from = from
    form.to = to
  },
})

watch(() => props.filters, (filters) => Object.assign(form, filters), { deep: true })

function apply() {
  emit('apply', { ...form })
}

function clear() {
  Object.assign(form, {
    view: 'active',
    per_page: 50,
    q: undefined,
    type: undefined,
    status: undefined,
    financial_account_id: undefined,
    category_id: undefined,
    from: undefined,
    to: undefined,
  })
  emit('clear')
}
</script>

<template>
  <ElCollapse v-model="activePanels" class="filter-collapse" data-test="transaction-filter-collapse">
    <ElCollapseItem name="search">
      <template #title>
        <span class="filter-collapse-title"><ElIcon><Search /></ElIcon>{{ t('transactions.search') }}</span>
      </template>
      <ElCard data-test="transaction-filter-card">
        <ElForm
          :model="form"
          label-position="top"
          class="filters"
          data-test="transaction-filters"
          @submit.prevent="apply"
        >
          <ElFormItem :label="t('transactions.searchLabel')">
            <ElInput v-model="form.q" clearable :placeholder="t('transactions.searchPlaceholder')" data-test="filter-search" />
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
              <ElOption v-for="account in accounts" :key="account.id" :label="account.name" :value="account.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('transactions.category')">
            <ElSelect v-model="form.category_id" clearable data-test="filter-category">
              <ElOption v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('transactions.period')">
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
            <ElButton :icon="RefreshLeft" data-test="clear-filters" @click="clear">{{ t('transactions.clear') }}</ElButton>
            <ElButton :icon="Search" :loading="loading" type="primary" data-test="apply-filters" @click="apply">{{ t('transactions.filter') }}</ElButton>
          </div>
        </template>
      </ElCard>
    </ElCollapseItem>
  </ElCollapse>
</template>

<style scoped>
.filter-collapse {
  margin-bottom: 24px;
}
.filter-collapse-title {
  align-items: center;
  display: inline-flex;
  font-weight: 600;
  gap: 8px;
}
.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 16px;
}
.filter-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
@media (max-width: 1024px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
