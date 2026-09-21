<script setup>
import { ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { formatBRL, formatIsoDate, installmentLabel, recognitionStatus } from '@/utils/credit-cards/creditCardFormatters'

/**
 * Renders the schedule exactly as the server allocated it: amounts, statements,
 * closing dates, and recognition state are never recalculated in the browser.
 */
defineProps({
  installments: { type: Array, default: () => [] },
})

const { t } = useI18n()
</script>

<template>
  <ul class="installment-schedule" data-test="installment-schedule">
    <li
      v-for="installment in installments"
      :key="installment.sequence"
      class="installment-schedule__row"
      :data-test="`installment-${installment.sequence}`"
    >
      <span class="installment-schedule__sequence">{{ installmentLabel(installment.sequence, installment.total_count) }}</span>
      <span class="installment-schedule__amount">{{ formatBRL(installment.amount.amount_centavos) }}</span>
      <span class="installment-schedule__statement">
        {{ t('creditCards.purchase.closesOn', { date: formatIsoDate(installment.statement?.closing_date) }) }}
      </span>
      <span class="installment-schedule__due">
        {{ t('creditCards.purchase.dueOn', { date: formatIsoDate(installment.statement?.due_date) }) }}
      </span>
      <ElTag :type="recognitionStatus(installment.recognition_status).tone" size="small">
        {{ t(recognitionStatus(installment.recognition_status).labelKey) }}
      </ElTag>
    </li>
  </ul>
</template>

<style scoped>
.installment-schedule {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.installment-schedule__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5rem;
}

.installment-schedule__sequence {
  min-inline-size: 2.5rem;
  font-weight: 600;
}

.installment-schedule__amount {
  font-variant-numeric: tabular-nums;
}

.installment-schedule__statement,
.installment-schedule__due {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}
</style>
