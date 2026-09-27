<script setup>
import { useI18n } from 'vue-i18n'
import { formatDashboardCurrency } from '@/utils/dashboard/dashboardFormatters'

defineProps({ accounts: { type: Array, required: true }, unattributedCardExpenses: { type: Object, default: null }, suppressMovements: Boolean, locale: { type: String, default: 'pt-BR' } })
const emit = defineEmits(['detail'])
const { t } = useI18n()
const fields = [
  ['realized_income', 'accountIncome', 'account_income'],
  ['direct_expenses', 'directExpenses', 'account_expenses'],
  ['net_financial_flow', 'netFlow', 'account_net_flow'],
  ['transfer_in', 'transferIn', 'account_transfer_in'],
  ['transfer_out', 'transferOut', 'account_transfer_out'],
  ['card_settlement', 'cardSettlement', 'account_card_settlement'],
]
</script>

<template>
  <section class="report-card" aria-labelledby="report-accounts-heading" data-test="report-accounts">
    <h2 id="report-accounts-heading">{{ t('reports.accounts') }}</h2>
    <p v-if="!accounts.length">{{ t('reports.emptySection') }}</p>
    <div v-else class="account-list"><article v-for="row in accounts" :key="row.account.id" class="account-row"><h3>{{ row.account.name }} <small v-if="row.account.status === 'archived'">({{ t('reports.archived') }})</small></h3><dl><template v-for="[key, label, metric], index in fields" :key="key"><div v-if="!suppressMovements || index < 3"><dt>{{ t(`reports.${label}`) }}</dt><dd><ElButton link type="primary" :aria-label="`${t('reports.details')}: ${row.account.name}, ${t(`reports.${label}`)}`" @click="emit('detail', { metric, metric_id: row.account.id, label: `${row.account.name} · ${t(`reports.${label}`)}` })">{{ formatDashboardCurrency(row[key].amount_centavos, { locale }) }}</ElButton></dd></div></template></dl></article></div>
    <p v-if="suppressMovements" class="note">{{ t('reports.movementsSuppressed') }}</p>
    <p v-if="unattributedCardExpenses" class="note">{{ t('reports.unattributedCard') }}: {{ formatDashboardCurrency(unattributedCardExpenses.amount_centavos, { locale }) }}. {{ t('reports.unattributedNote') }}</p>
  </section>
</template>

<style scoped>
.report-card { display: grid; gap: 16px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); min-width: 0; } h2, h3, p, dl, dd { margin: 0; } h2 { font-size: 20px; } h3 { font-size: 16px; } small, .note { color: var(--color-text-muted); font-size: 13px; } .account-list { display: grid; gap: 12px; } .account-row { padding: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md); } dl { display: grid; gap: 8px; margin-top: 12px; } dl > div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--color-border); } dt { color: var(--color-text-muted); } dd { font-variant-numeric: tabular-nums; }
</style>
