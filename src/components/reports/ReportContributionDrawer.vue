<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDashboardCurrency, formatDashboardDate, resultDirection } from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({ modelValue: Boolean, target: { type: Object, default: null }, detail: { type: Object, default: null }, loading: Boolean, error: { type: Object, default: null }, locale: { type: String, default: 'pt-BR' } })
const emit = defineEmits(['update:modelValue', 'load-more', 'retry'])
const { t } = useI18n()
const sourceLabels = { ordinary_transaction: 'ordinaryTransaction', card_installment: 'cardInstallment', card_credit_adjustment: 'cardAdjustment', transfer: 'transfer', card_statement_payment: 'statementPayment' }
const title = computed(() => t('reports.contributionTitle', { metric: props.target?.label ?? '' }))
function amountClass(classification, amount) {
  if (classification === 'income') return 'report-income-amount'
  if (classification === 'expense') return 'report-expense-amount'
  if (classification === 'financial_result' || classification === 'account_net_flow') return `report-result-${resultDirection(amount)}`
  return ''
}
function metricClass(metric, amount) {
  if (['realized_income', 'income_category', 'account_income'].includes(metric)) return amountClass('income', amount)
  if (['realized_expenses', 'expense_category', 'account_expenses'].includes(metric)) return amountClass('expense', amount)
  return amountClass(metric, amount)
}
function sourceHref(row) {
  if (row.source_kind === 'ordinary_transaction') return { name: 'transactions', query: { highlight: row.source_id } }
  if (row.related_statement_id) return { name: 'credit-card-statement-detail', params: { statement_id: row.related_statement_id } }
  if (row.source_kind === 'transfer') return { name: 'transfers', query: { highlight: row.source_id } }
  return null
}
</script>

<template>
  <ElDrawer :model-value="modelValue" :title="title" size="min(92vw, 580px)" data-test="report-contribution-drawer" @update:model-value="emit('update:modelValue', $event)">
    <div class="drawer-body">
      <ElAlert v-if="error" type="error" :closable="false" :title="t('reports.detailError')"><ElButton @click="emit('retry')">{{ t('reports.retry') }}</ElButton></ElAlert>
      <ElSkeleton v-if="loading && !detail" :rows="4" animated />
      <template v-if="detail">
        <p class="total"><strong>{{ t('reports.contributionTotal') }}:</strong> <span :class="metricClass(detail.metric, detail.total.amount_centavos)">{{ formatDashboardCurrency(detail.total.amount_centavos, { locale }) }}</span></p>
        <p class="period-label">{{ t(detail.which_period === 'previous' ? 'reports.previous' : 'reports.current') }}: {{ detail.scope?.[detail.which_period === 'previous' ? 'previous_period' : 'current_period']?.from }} – {{ detail.scope?.[detail.which_period === 'previous' ? 'previous_period' : 'current_period']?.to }}</p>
        <ol class="contribution-list"><li v-for="row in detail.contributions" :key="`${row.source_kind}-${row.source_id}-${row.related_credit_event_id ?? ''}-${row.recognized_date}`">
          <div class="contribution-head"><strong>{{ row.description }}</strong><span :class="amountClass(row.classification, row.signed_amount.amount_centavos)">{{ formatDashboardCurrency(row.signed_amount.amount_centavos, { locale }) }}</span></div>
          <p>{{ formatDashboardDate(row.recognized_date, locale) }} · {{ t(`reports.${sourceLabels[row.source_kind]}`) }}</p>
          <p v-if="row.category">{{ row.category.name }}<span v-if="row.category.status === 'archived'"> ({{ t('reports.archived') }})</span></p>
          <p v-if="row.account">{{ row.account.name }}<span v-if="row.account.status === 'archived'"> ({{ t('reports.archived') }})</span></p>
          <p>{{ t('reports.source') }} #{{ row.source_id }}</p>
          <p v-if="row.related_purchase_id">{{ t('reports.purchaseReference', { id: row.related_purchase_id }) }}</p>
          <p v-if="row.related_credit_event_id">{{ t('reports.creditEventReference', { id: row.related_credit_event_id }) }}</p>
          <RouterLink v-if="sourceHref(row)" :to="sourceHref(row)">{{ t('reports.source') }}</RouterLink>
        </li></ol>
        <ElButton v-if="detail.next_cursor" :loading="loading" data-test="report-load-more" @click="emit('load-more')">{{ t('reports.loadMore') }}</ElButton>
      </template>
    </div>
    <template #footer><ElButton data-test="report-detail-close" @click="emit('update:modelValue', false)">{{ t('reports.close') }}</ElButton></template>
  </ElDrawer>
</template>

<style scoped>
.drawer-body { display: grid; gap: 16px; } p { margin: 0; } .total { font-size: 18px; font-variant-numeric: tabular-nums; } .period-label, li p { color: var(--color-text-muted); font-size: 13px; } .contribution-list { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; } li { display: grid; gap: 4px; padding: 12px 0; border-bottom: 1px solid var(--color-border); } .contribution-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-variant-numeric: tabular-nums; }
</style>
