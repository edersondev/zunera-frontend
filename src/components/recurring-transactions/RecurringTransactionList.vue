<script setup>
import { useI18n } from 'vue-i18n'
import {
  formatRecurrenceAmount,
  frequencyLabel,
  nextExpectedLabel,
  stateLabel,
} from '@/utils/recurring-transactions/recurringTransactionFormatters'

defineProps({
  rules: { type: Array, required: true },
  loading: Boolean,
  hasMore: Boolean,
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
      <ElTableColumn :label="t('recurringTransactions.columns.description')" min-width="220">
        <template #default="{ row }">
          <div class="cell-stack">
            <strong>{{ row.description }}</strong>
            <span class="muted">{{ row.financial_account?.name }} · {{ row.category?.name }}</span>
            <ElTag effect="plain" size="small" data-test="recurrence-type">
              {{ t(`transactions.${row.type}`) }}
            </ElTag>
          </div>
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
      <ElTableColumn :label="t('recurringTransactions.columns.amount')" width="140">
        <template #default="{ row }">
          <span data-test="recurrence-amount">{{ formatRecurrenceAmount(row) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn :label="t('recurringTransactions.columns.actions')" width="280">
        <template #default="{ row }">
          <div class="row-actions">
            <ElButton size="small" data-test="recurrence-open" @click.stop="emit('open', row)">
              {{ t('recurringTransactions.occurrences') }}
            </ElButton>
            <ElButton size="small" data-test="recurrence-edit" @click.stop="emit('edit', row)">
              {{ t('transactions.editAction') }}
            </ElButton>
            <ElButton
              v-if="row.state === 'active'"
              size="small"
              data-test="recurrence-pause"
              @click.stop="emit('pause', row)"
            >
              {{ t('recurringTransactions.pause') }}
            </ElButton>
            <ElButton
              v-if="row.state === 'paused'"
              size="small"
              data-test="recurrence-resume"
              @click.stop="emit('resume', row)"
            >
              {{ t('recurringTransactions.resume') }}
            </ElButton>
            <ElButton
              v-if="row.state !== 'ended'"
              size="small"
              data-test="recurrence-end"
              @click.stop="emit('end', row)"
            >
              {{ t('recurringTransactions.end') }}
            </ElButton>
          </div>
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
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-table__body-wrapper) {
  overflow-x: auto;
}

.load-more {
  margin-top: 16px;
}
</style>
