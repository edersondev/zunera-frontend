<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatRecurrenceAmount,
  formatRecurrenceDate,
  frequencyLabel,
  nextExpectedLabel,
  occurrenceStatusLabel,
  stateLabel,
} from '@/utils/recurring-transactions/recurringTransactionFormatters'

const props = defineProps({
  modelValue: Boolean,
  rule: { type: Object, default: null },
  occurrences: { type: Array, default: () => [] },
  loadingOccurrences: Boolean,
})
const emit = defineEmits(['update:modelValue', 'open-occurrence'])
const { t } = useI18n()
const pausedByArchive = computed(() => props.rule?.paused_reason === 'association_archived')
</script>

<template>
  <ElDrawer
    :model-value="modelValue"
    size="min(94vw, 520px)"
    :title="rule?.description ?? t('recurringTransactions.title')"
    data-test="recurrence-detail-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="rule">
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem :label="t('recurringTransactions.criteria.state')">
          <span data-test="recurrence-detail-state">{{ stateLabel(rule, t) }}</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="t('recurringTransactions.frequency')">
          {{ frequencyLabel(rule.frequency, t) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="t('recurringTransactions.amount')">
          {{ formatRecurrenceAmount(rule) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="t('recurringTransactions.account')">
          {{ rule.financial_account?.name }}
          <span v-if="rule.financial_account?.status === 'archived'" class="hint">({{ t('transactions.archived') }})</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="t('recurringTransactions.category')">
          {{ rule.category?.name }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="t('recurringTransactions.startDate')">
          {{ formatRecurrenceDate(rule.start_date) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="t('recurringTransactions.endDate')">
          {{ rule.end_date ? formatRecurrenceDate(rule.end_date) : '—' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="t('recurringTransactions.nextExpected')">
          <span data-test="recurrence-detail-next">{{ nextExpectedLabel(rule, t) }}</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="t('recurringTransactions.occurrences')">
          <span data-test="recurrence-detail-count">{{ rule.generated_occurrence_count }}</span>
        </ElDescriptionsItem>
      </ElDescriptions>

      <ElAlert
        v-if="pausedByArchive"
        class="hint-block"
        type="warning"
        :closable="false"
        show-icon
        :title="t('recurringTransactions.repairAssociation')"
        data-test="recurrence-detail-repair"
      />
      <p class="hint" data-test="recurrence-detail-scope">{{ t('recurringTransactions.ruleScope') }}</p>

      <h3>{{ t('recurringTransactions.occurrences') }}</h3>
      <p class="muted">{{ t('recurringTransactions.occurrencesDescription') }}</p>
      <p v-if="loadingOccurrences" class="hint" data-test="recurrence-occurrences-loading">{{ t('common.loading') }}</p>
      <p v-else-if="occurrences.length === 0" class="hint" data-test="recurrence-occurrences-empty">
        {{ t('recurringTransactions.emptyOccurrences') }}
      </p>
      <ElTable v-else :data="occurrences" data-test="recurrence-occurrence-table" row-key="id">
        <ElTableColumn :label="t('recurringTransactions.scheduledDate')" width="140">
          <template #default="{ row }">{{ formatRecurrenceDate(row.scheduled_date) }}</template>
        </ElTableColumn>
        <ElTableColumn :label="t('recurringTransactions.occurrenceStatus')" width="160">
          <template #default="{ row }">
            <ElTag :type="row.removed_at ? 'danger' : 'info'" effect="plain" data-test="recurrence-occurrence-status">
              {{ occurrenceStatusLabel(row, t) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn :label="t('recurringTransactions.columns.actions')" width="160">
          <template #default="{ row }">
            <ElButton size="small" data-test="recurrence-occurrence-open" @click="emit('open-occurrence', row)">
              {{ t('recurringTransactions.openOccurrence') }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <p class="hint" data-test="recurrence-occurrence-scope">{{ t('recurringTransactions.oneOccurrenceScope') }}</p>
    </template>
  </ElDrawer>
</template>
