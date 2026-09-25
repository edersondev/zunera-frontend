<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { Filter, RefreshLeft } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { cardIdentityLabel } from '@/utils/credit-cards/creditCardFormatters'
import { frequencyOptions, stateOptions } from '@/utils/recurring-transactions/recurringTransactionFormatters'

const props = defineProps({
  filters: { type: Object, required: true },
  accounts: { type: Array, required: true },
  cards: { type: Array, default: () => [] },
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
const destinationOptions = computed(() => [
  { value: 'financial_account', label: t('recurringTransactions.destinationOptions.financial_account') },
  { value: 'credit_card', label: t('recurringTransactions.destinationOptions.credit_card') },
])
const activeCount = computed(() => ['type', 'destination_type', 'financial_account_id', 'credit_card_id', 'category_id', 'frequency', 'state']
  .filter((key) => props.filters[key] !== undefined && props.filters[key] !== null && props.filters[key] !== '').length)

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
  form.page = 1
  emit('clear')
}
</script>

<template>
  <ElCollapse v-model="activePanels" class="mb-4" data-test="recurrence-filter-collapse">
    <ElCollapseItem name="filters">
      <template #title>
        <span class="inline-flex items-center gap-2 font-semibold"><ElIcon><Filter /></ElIcon>{{ t('recurringTransactions.filter') }}<span v-if="activeCount" class="text-sm font-normal text-[var(--color-text-muted)]">· {{ t('recurringTransactions.activeFilterCount', { count: activeCount }) }}</span></span>
      </template>
      <div class="pt-3">
        <ElForm :model="form" label-position="top" class="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3" data-test="recurrence-filters" @submit.prevent="apply">
          <ElFormItem :label="t('recurringTransactions.criteria.type')">
            <ElSelect v-model="form.type" clearable data-test="recurrence-filter-type">
              <ElOption v-for="option in typeOptions" :key="option.value" :label="option.label" :value="option.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('recurringTransactions.destination')">
            <ElSelect v-model="form.destination_type" clearable data-test="recurrence-filter-destination">
              <ElOption v-for="option in destinationOptions" :key="option.value" :label="option.label" :value="option.value" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('recurringTransactions.criteria.financial_account_id')">
            <ElSelect v-model="form.financial_account_id" clearable data-test="recurrence-filter-account">
              <ElOption v-for="account in accounts" :key="account.id" :label="account.name" :value="account.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('recurringTransactions.creditCard')">
            <ElSelect v-model="form.credit_card_id" clearable data-test="recurrence-filter-card">
              <ElOption v-for="card in cards" :key="card.id" :label="cardIdentityLabel(card)" :value="card.id" />
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
        </ElForm>
          <div class="flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1" data-test="recurrence-filter-actions">
            <ElButton :icon="RefreshLeft" data-test="recurrence-filter-clear" @click="clear">
              {{ t('recurringTransactions.clear') }}
            </ElButton>
            <ElButton :icon="Filter" type="primary" data-test="recurrence-filter-apply" @click="apply">
              {{ t('common.save') }}
            </ElButton>
          </div>
      </div>
    </ElCollapseItem>
  </ElCollapse>
</template>
