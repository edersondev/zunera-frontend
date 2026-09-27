<script setup>
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDashboardPeriod } from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({ scope: { type: Object, required: true }, locale: { type: String, default: 'pt-BR' }, loading: Boolean })
const emit = defineEmits(['change'])
const { t } = useI18n()
const draftFrom = shallowRef(props.scope.from ?? '')
const draftTo = shallowRef(props.scope.to ?? '')
const draftMonth = shallowRef(props.scope.month ?? '')
watch(() => [props.scope.from, props.scope.to, props.scope.month], ([from, to, month]) => { draftFrom.value = from ?? ''; draftTo.value = to ?? ''; draftMonth.value = month ?? '' })
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}
const customValid = computed(() => validDate(draftFrom.value) && validDate(draftTo.value) && draftFrom.value <= draftTo.value)
const monthValid = computed(() => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year').value
  const month = parts.find((part) => part.type === 'month').value
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(draftMonth.value) && draftMonth.value < `${year}-${month}`
})
const choices = ['current_month', 'previous_month', 'current_year', 'previous_year', 'historical_month', 'custom']
const labels = { current_month: 'currentMonth', previous_month: 'previousMonth', current_year: 'currentYear', previous_year: 'previousYear', historical_month: 'historicalMonth', custom: 'custom' }
function select(value) { if (value === 'custom' || value === 'historical_month') { emit('change', { preset: value, from: null, to: null, month: null }); return } emit('change', { preset: value, from: null, to: null, month: null }) }
</script>

<template>
  <section class="period-selector" aria-labelledby="report-period-heading" data-test="report-period">
    <div class="heading"><h2 id="report-period-heading">{{ t('reports.period') }}</h2><p v-if="scope.current_period" data-test="report-period-range">{{ formatDashboardPeriod(scope.current_period, locale) }}</p></div>
    <ElRadioGroup :model-value="scope.preset" class="choices" @update:model-value="select"><ElRadioButton v-for="choice in choices" :key="choice" :value="choice" :data-test="`report-period-${choice}`">{{ t(`reports.${labels[choice]}`) }}</ElRadioButton></ElRadioGroup>
    <ElForm v-if="scope.preset === 'custom'" class="fields" label-position="top" @submit.prevent="customValid && emit('change', { preset: 'custom', from: draftFrom, to: draftTo, month: null })"><ElFormItem :label="t('reports.from')"><ElDatePicker v-model="draftFrom" type="date" value-format="YYYY-MM-DD" :placeholder="t('reports.from')" /></ElFormItem><ElFormItem :label="t('reports.to')"><ElDatePicker v-model="draftTo" type="date" value-format="YYYY-MM-DD" :placeholder="t('reports.to')" /></ElFormItem><ElButton type="primary" native-type="submit" :disabled="!customValid || loading" data-test="report-period-apply">{{ t('reports.apply') }}</ElButton></ElForm>
    <ElForm v-if="scope.preset === 'historical_month'" class="fields" label-position="top" @submit.prevent="monthValid && emit('change', { preset: 'historical_month', month: draftMonth, from: null, to: null })"><ElFormItem :label="t('reports.month')"><ElDatePicker v-model="draftMonth" type="month" value-format="YYYY-MM" :placeholder="t('reports.month')" /></ElFormItem><ElButton type="primary" native-type="submit" :disabled="!monthValid || loading" data-test="report-month-apply">{{ t('reports.apply') }}</ElButton></ElForm>
    <p v-if="scope.preset === 'custom' && (draftFrom || draftTo) && !customValid" role="alert">{{ t('reports.invalidRange') }}</p>
  </section>
</template>

<style scoped>
.period-selector { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); } .heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; } h2, p { margin: 0; } h2 { font-size: 20px; } p { color: var(--color-text-muted); } .choices { display: flex; flex-wrap: wrap; } .fields { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; } .fields :deep(.el-form-item) { margin-bottom: 0; } @media(max-width: 639px) { .fields { display: grid; } }
</style>
