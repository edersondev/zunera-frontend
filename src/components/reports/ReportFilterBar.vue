<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({ scope: { type: Object, required: true }, accounts: { type: Array, default: () => [] }, categories: { type: Array, default: () => [] } })
const emit = defineEmits(['change', 'reset'])
const { t } = useI18n()
const selectedCategory = computed(() => props.categories.find((item) => item.id === props.scope.category_id))
const categoryOptions = computed(() => props.categories.filter((item) => !props.scope.transaction_type || item.classification === props.scope.transaction_type))
const accountName = computed(() => props.accounts.find((item) => item.id === props.scope.account_id)?.name ?? `#${props.scope.account_id}`)
const categoryName = computed(() => selectedCategory.value?.name ?? `#${props.scope.category_id}`)
function update(field, value) {
  const patch = { [field]: value || null }
  if (field === 'transaction_type' && selectedCategory.value && value && selectedCategory.value.classification !== value) patch.category_id = null
  if (field === 'category_id' && value) {
    const category = props.categories.find((item) => item.id === value)
    if (category && props.scope.transaction_type && category.classification !== props.scope.transaction_type) patch.transaction_type = null
  }
  emit('change', patch)
}
</script>

<template>
  <section class="filter-bar" aria-labelledby="report-filters-heading" data-test="report-filters">
    <h2 id="report-filters-heading">{{ t('reports.filters') }}</h2>
    <ElForm label-position="top" class="filter-fields">
      <ElFormItem :label="t('reports.account')"><ElSelect :model-value="scope.account_id" clearable :placeholder="t('reports.allAccounts')" data-test="report-account-filter" @update:model-value="update('account_id', $event)"><ElOption v-for="account in accounts" :key="account.id" :label="`${account.name}${account.status === 'archived' ? ` (${t('reports.archived')})` : ''}`" :value="account.id" /></ElSelect></ElFormItem>
      <ElFormItem :label="t('reports.type')"><ElSelect :model-value="scope.transaction_type" clearable :placeholder="t('reports.allTypes')" data-test="report-type-filter" @update:model-value="update('transaction_type', $event)"><ElOption :label="t('reports.incomeType')" value="income" /><ElOption :label="t('reports.expenseType')" value="expense" /></ElSelect></ElFormItem>
      <ElFormItem :label="t('reports.category')"><ElSelect :model-value="scope.category_id" clearable :placeholder="t('reports.allCategories')" data-test="report-category-filter" @update:model-value="update('category_id', $event)"><ElOption v-for="category in categoryOptions" :key="category.id" :label="`${category.name}${category.status === 'archived' ? ` (${t('reports.archived')})` : ''}`" :value="category.id" /></ElSelect></ElFormItem>
    </ElForm>
    <div v-if="scope.account_id || scope.category_id || scope.transaction_type" class="chips"><strong>{{ t('reports.filtered') }}</strong><ElTag v-if="scope.account_id" closable @close="update('account_id', null)">{{ t('reports.accountFilter', { name: accountName }) }}</ElTag><ElTag v-if="scope.category_id" closable @close="update('category_id', null)">{{ t('reports.categoryFilter', { name: categoryName }) }}</ElTag><ElTag v-if="scope.transaction_type" closable @close="update('transaction_type', null)">{{ t('reports.typeFilter', { name: t(scope.transaction_type === 'income' ? 'reports.incomeType' : 'reports.expenseType') }) }}</ElTag><ElButton link type="primary" @click="emit('reset')">{{ t('reports.resetFilters') }}</ElButton></div>
  </section>
</template>

<style scoped>
.filter-bar { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); } h2 { margin: 0; font-size: 20px; } .filter-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: 12px; } .filter-fields :deep(.el-form-item) { margin-bottom: 0; } .filter-fields :deep(.el-select) { width: 100%; } .chips { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; } .chips strong { font-size: 14px; }
</style>
