<script setup>
import { useI18n } from 'vue-i18n'
import { formatDashboardCurrency, formatDashboardPercent } from '@/utils/dashboard/dashboardFormatters'

defineProps({ items: { type: Array, required: true }, kind: { type: String, required: true }, locale: { type: String, default: 'pt-BR' } })
const emit = defineEmits(['detail'])
const { t } = useI18n()
</script>

<template>
  <section class="report-card" :aria-labelledby="`report-${kind}-categories-heading`" :data-test="`report-${kind}-categories`">
    <h2 :id="`report-${kind}-categories-heading`">{{ t(kind === 'income' ? 'reports.categoriesIncome' : 'reports.categoriesExpense') }}</h2>
    <p v-if="!items.length">{{ t(kind === 'income' ? 'reports.noIncome' : 'reports.noExpenses') }}</p>
    <ol v-else class="category-list">
      <li v-for="item in items" :key="item.category.id">
        <div class="category-heading"><strong>{{ item.category.name }} <span v-if="item.category.status === 'archived'" class="status">({{ t('reports.archived') }})</span></strong><span>{{ formatDashboardCurrency(item.total.amount_centavos, { locale }) }}</span></div>
        <div class="category-meta"><span>{{ t('reports.share') }}: {{ formatDashboardPercent(item.share_percent, locale) }}</span><ElButton link type="primary" :aria-label="`${t('reports.details')}: ${item.category.name}`" @click="emit('detail', { metric: `${kind}_category`, metric_id: item.category.id, label: item.category.name })">{{ t('reports.details') }}</ElButton></div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.report-card { display: grid; gap: 16px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); min-width: 0; }
h2, p { margin: 0; } h2 { font-size: 20px; } p, .status, .category-meta { color: var(--color-text-muted); }
.category-list { display: grid; gap: 0; padding-left: 24px; margin: 0; } li { padding: 10px 0; border-bottom: 1px solid var(--color-border); } .category-heading, .category-meta { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; } .category-heading span { font-variant-numeric: tabular-nums; } .status { font-weight: 400; font-size: 12px; }
</style>
