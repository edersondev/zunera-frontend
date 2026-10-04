<script setup>
import { computed, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import { listAccountDataArchiveRecords } from '@/services/accountDataService'

const { t, te, locale } = useI18n()
const route = useRoute()
const archiveId = computed(() => Number(route.params.archive_id))
const recordTypes = [
  'financial_accounts', 'categories', 'transactions', 'transfers',
  'recurring_transactions', 'monthly_budgets', 'budget_category_plans',
  'credit_cards', 'credit_card_purchases', 'credit_card_statements',
  'credit_card_installments', 'credit_card_statement_payments',
  'credit_card_credit_events', 'credit_card_credit_applications',
  'recurring_card_occurrences', 'financial_goals', 'financial_goal_activities',
]
const type = shallowRef('financial_accounts')
const page = shallowRef(1)
const records = shallowRef([])
const total = shallowRef(0)
const loading = shallowRef(false)
const error = shallowRef(false)

watch([archiveId, type, page], loadRecords, { immediate: true })

async function loadRecords() {
  loading.value = true
  error.value = false
  try {
    const result = await listAccountDataArchiveRecords(archiveId.value, type.value, page.value)
    records.value = result.data
    total.value = result.meta.total
  } catch {
    records.value = []
    total.value = 0
    error.value = true
  } finally {
    loading.value = false
  }
}

function changeType(value) {
  type.value = value
  page.value = 1
}

function titleFor(record) {
  const payload = record.payload
  return payload.name || payload.description || payload.event_key || `#${record.source_id}`
}

function formatValue(key, value) {
  if (value === null) return '—'
  if (key.endsWith('_centavos')) {
    return new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'BRL' }).format(Number(value) / 100)
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function details(record) {
  return Object.entries(record.payload)
    .filter(([key]) => key !== 'user_id' && key !== 'search_text')
    .map(([key, value]) => ({
      key,
      label: te(`accountData.fields.${key}`) ? t(`accountData.fields.${key}`) : key.replaceAll('_', ' '),
      value: formatValue(key, value),
    }))
}
</script>

<template>
  <div class="archive-view">
    <PageHeader :title="t('accountData.archiveNumber', { id: archiveId })" :description="t('accountData.readOnlyDescription')">
      <template #actions><RouterLink :to="{ name: 'account-data-settings' }">{{ t('accountData.backToSettings') }}</RouterLink></template>
    </PageHeader>
    <ElForm label-position="top" class="archive-filter">
      <ElFormItem :label="t('accountData.recordType')">
        <ElSelect :model-value="type" @update:model-value="changeType">
          <ElOption v-for="item in recordTypes" :key="item" :value="item" :label="t(`accountData.types.${item}`)" />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <ElSkeleton v-if="loading" :rows="4" animated />
    <ElAlert v-else-if="error" type="error" :title="t('accountData.loadError')" :closable="false" show-icon>
      <ElButton @click="loadRecords">{{ t('common.retry') }}</ElButton>
    </ElAlert>
    <ElEmpty v-else-if="records.length === 0" :description="t('accountData.noRecords')" />
    <div v-else class="record-list">
      <ElCard v-for="record in records" :key="`${record.type}-${record.source_id}`">
        <h2>{{ titleFor(record) }}</h2>
        <ElDescriptions :column="1" border>
          <ElDescriptionsItem v-for="field in details(record)" :key="field.key" :label="field.label">{{ field.value }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>
    </div>
    <ElPagination
      v-if="total > 25" v-model:current-page="page" :page-size="25" :total="total"
      layout="prev, pager, next" class="pagination"
    />
  </div>
</template>

<style scoped>
.archive-view { width: min(100%, 980px); margin-inline: auto; }
.archive-filter { max-width: 340px; }
.record-list { display: grid; gap: 16px; }
.record-list h2 { margin: 0 0 16px; font-size: 18px; overflow-wrap: anywhere; }
.pagination { justify-content: center; margin-top: 24px; }
</style>
