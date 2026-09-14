<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { Filter } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { frequencyOptions, stateOptions } from '@/utils/recurring-transactions/recurringTransactionFormatters'

const props = defineProps({
  filters: { type: Object, required: true },
  accounts: { type: Array, required: true },
  categories: { type: Array, required: true },
})
const emit = defineEmits(['apply', 'clear'])
const { t } = useI18n()
const form = reactive({ ...props.filters })
const activePanels = shallowRef([])
const typeOptions = computed(() => [
  { value: 'income', label: t('transactions.income') },
  { value: 'expense', label: t('transactions.expense') },
])

watch(
  () => props.filters,
  (filters) => Object.assign(form, filters),
  { deep: true },
)

function apply() {
  emit('apply', { ...form })
}

function clear() {
  Object.keys(form).forEach((key) => {
    if (!['page', 'per_page'].includes(key)) delete form[key]
  })
  emit('clear')
}
</script>

<template>
  <ElCollapse v-model="activePanels" class="filter-collapse" data-test="recurrence-filter-collapse">
    <ElCollapseItem name="filters">
      <template #title>
        <span class="filter-collapse-title"><ElIcon><Filter /></ElIcon>{{ t('recurringTransactions.filter') }}</span>
      </template>
      <ElCard data-test="recurrence-filter-card">
        <ElForm :model="form" label-position="top" class="filters" data-test="recurrence-filters" @submit.prevent="apply">
          <ElFormItem :label="t('recurringTransactions.criteria.type')">
            <ElSelect v-model="form.type" clearable data-test="recurrence-filter-type">
              <ElOption v-for="option in typeOptions" :key="option.value" :label="option.label" :value="option.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('recurringTransactions.criteria.financial_account_id')">
            <ElSelect v-model="form.financial_account_id" clearable data-test="recurrence-filter-account">
              <ElOption v-for="account in accounts" :key="account.id" :label="account.name" :value="account.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('recurringTransactions.criteria.category_id')">
            <ElSelect v-model="form.category_id" clearable data-test="recurrence-filter-category">
              <ElOption v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('recurringTransactions.criteria.frequency')">
            <ElSelect v-model="form.frequency" clearable data-test="recurrence-filter-frequency">
              <ElOption v-for="option in frequencyOptions(t)" :key="option.value" :label="option.label" :value="option.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('recurringTransactions.criteria.state')">
            <ElSelect v-model="form.state" clearable data-test="recurrence-filter-state">
              <ElOption v-for="option in stateOptions(t)" :key="option.value" :label="option.label" :value="option.value" />
            </ElSelect>
          </ElFormItem>
          <div class="filter-actions">
            <ElButton data-test="recurrence-filter-clear" @click="clear">{{ t('recurringTransactions.clear') }}</ElButton>
            <ElButton type="primary" data-test="recurrence-filter-apply" @click="apply">{{ t('common.save') }}</ElButton>
          </div>
        </ElForm>
      </ElCard>
    </ElCollapseItem>
  </ElCollapse>
</template>
