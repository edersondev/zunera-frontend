<script setup>
import { useI18n } from 'vue-i18n'
import {
  formatRecurrenceAmount,
  frequencyLabel,
  nextExpectedLabel,
  stateLabel,
} from '@/utils/recurring-transactions/recurringTransactionFormatters'
import RecurringTransactionRowActions from './RecurringTransactionRowActions.vue'

defineProps({
  rules: { type: Array, required: true },
  loading: Boolean,
  hasMore: Boolean,
  saving: Boolean,
})
const emit = defineEmits(['open', 'edit', 'pause', 'resume', 'end', 'load-more'])
const { t } = useI18n()
</script>

<template>
  <div data-test="recurrence-list">
    <ElTable
      :data="rules"
      :empty-text="t('recurringTransactions.empty')"
      row-key="id"
      @row-click="emit('open', $event)"
    >
      <ElTableColumn :label="t('recurringTransactions.columns.description')" min-width="180">
        <template #default="{ row }">
          <strong>{{ row.description }}</strong>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('recurringTransactions.account')" min-width="150">
        <template #default="{ row }">
          <span data-test="recurrence-account">{{ row.financial_account?.name }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('recurringTransactions.category')" min-width="150">
        <template #default="{ row }">
          <span data-test="recurrence-category">{{ row.category?.name }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('recurringTransactions.columns.frequency')" width="120">
        <template #default="{ row }">
          <ElTag data-test="recurrence-frequency-tag" effect="plain">
            {{ frequencyLabel(row.frequency, t) }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('recurringTransactions.columns.next')" width="150">
        <template #default="{ row }">
          <span data-test="recurrence-next">{{ nextExpectedLabel(row, t) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('recurringTransactions.columns.state')" width="230">
        <template #default="{ row }">
          <span class="cell-stack">
            <ElTag
              :type="row.state === 'active' ? 'success' : 'info'"
              effect="plain"
              data-test="recurrence-state"
            >
              {{ stateLabel(row, t) }}
            </ElTag>
            <span
              v-if="row.paused_reason === 'association_archived'"
              class="hint"
              data-test="recurrence-repair-hint"
            >
              {{ t('recurringTransactions.repairAssociation') }}
            </span>
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('recurringTransactions.columns.amount')" min-width="180">
        <template #default="{ row }">
          <span
            :class="row.type === 'income' ? 'income' : 'expense'"
            data-test="recurrence-amount"
          >
            {{ row.type === 'income' ? '+' : '−' }} {{ formatRecurrenceAmount(row) }}
          </span>
        </template>
      </ElTableColumn>
      <ElTableColumn width="64" align="center">
        <template #default="{ row }">
          <RecurringTransactionRowActions
            :rule="row"
            :saving="saving"
            @edit="emit('edit', $event)"
            @pause="emit('pause', $event)"
            @resume="emit('resume', $event)"
            @end="emit('end', $event)"
          />
        </template>
      </ElTableColumn>
    </ElTable>
    <div v-if="loading" class="hint" data-test="recurrence-loading">{{ t('common.loading') }}</div>
    <ElButton
      v-if="hasMore"
      class="load-more"
      data-test="recurrence-load-more"
      @click="emit('load-more')"
    >
      {{ t('recurringTransactions.loadMore') }}
    </ElButton>
  </div>
</template>

<style scoped>
:deep(.el-table__body-wrapper) {
  overflow-x: auto;
}

.load-more {
  margin-top: 16px;
}

.income {
  color: var(--color-financial-positive);
  font-variant-numeric: tabular-nums;
}

.expense {
  color: var(--color-financial-negative);
  font-variant-numeric: tabular-nums;
}
</style>
