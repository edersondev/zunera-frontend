<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { RefreshLeft, Search } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { transferStatusOptions } from '@/utils/transfers/transferOptions'

const props = defineProps({
  filters: { type: Object, required: true },
  accounts: { type: Array, required: true },
  loading: Boolean,
})
const emit = defineEmits(['apply', 'clear'])
const { t } = useI18n()
const form = reactive({ ...props.filters })
const activePanels = shallowRef([])
const statuses = computed(() => transferStatusOptions(t))
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
  Object.assign(form, clearedFilters())
  emit('clear')
}

function clearedFilters() {
  return {
    view: 'active',
    per_page: 50,
    q: undefined,
    status: undefined,
    source_financial_account_id: undefined,
    destination_financial_account_id: undefined,
    from: undefined,
    to: undefined,
  }
}
</script>

<template>
  <ElCollapse v-model="activePanels" class="filter-collapse" data-test="transfer-filter-collapse">
    <ElCollapseItem name="search">
      <template #title>
        <span class="filter-collapse-title">
          <ElIcon><Search /></ElIcon>{{ t('transfers.search') }}
        </span>
      </template>
      <ElCard data-test="transfer-filter-card">
        <ElForm
          :model="form"
          label-position="top"
          class="filters"
          data-test="transfer-filters"
          @submit.prevent="apply"
        >
          <ElFormItem :label="t('transfers.searchLabel')">
            <ElInput v-model="form.q" clearable :placeholder="t('transfers.searchPlaceholder')" data-test="filter-search" />
          </ElFormItem>
          <ElFormItem :label="t('transfers.status')">
            <ElSelect v-model="form.status" clearable data-test="filter-status">
              <ElOption
                v-for="status in statuses"
                :key="status.value"
                :label="status.label"
                :value="status.value"
              />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('transfers.source')">
            <ElSelect
              v-model="form.source_financial_account_id"
              clearable
              data-test="filter-source"
            >
              <ElOption v-for="account in accounts" :key="account.id" :label="account.name" :value="account.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('transfers.destination')">
            <ElSelect
              v-model="form.destination_financial_account_id"
              clearable
              data-test="filter-destination"
            >
              <ElOption v-for="account in accounts" :key="account.id" :label="account.name" :value="account.id" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem :label="t('transfers.period')">
            <ElDatePicker
              v-model="dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              :range-separator="t('transfers.criteria.to')"
              :start-placeholder="t('transfers.startDate')"
              :end-placeholder="t('transfers.endDate')"
              data-test="filter-date-range"
            />
          </ElFormItem>
        </ElForm>
        <template #footer>
          <div class="filter-actions">
            <ElButton :icon="RefreshLeft" data-test="clear-filters" @click="clear">
              {{ t('transfers.clear') }}
            </ElButton>
            <ElButton :icon="Search" :loading="loading" type="primary" data-test="apply-filters" @click="apply">
              {{ t('transfers.filter') }}
            </ElButton>
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
