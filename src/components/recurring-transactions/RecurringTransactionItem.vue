<script setup>
import { computed } from 'vue'
import { ArrowRight, CreditCard, Wallet, Warning, ArrowDown } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from '@/composables/useLocale'
import { cardIdentityLabel } from '@/utils/credit-cards/creditCardFormatters'
import {
  cardOccurrenceStateLabel, formatCentavos, formatRecurrenceAmount, formatRecurrenceDate,
  frequencyLabel, nextExpectedLabel, stateLabel,
} from '@/utils/recurring-transactions/recurringTransactionFormatters'
import RecurringTransactionRowActions from './RecurringTransactionRowActions.vue'

const props = defineProps({
  rule: { type: Object, required: true },
  expanded: Boolean,
  reviewPreview: { type: Object, default: null },
  reviewLoading: Boolean,
  saving: Boolean,
})
const emit = defineEmits(['toggle', 'review', 'view-history', 'edit', 'pause', 'resume', 'end'])
const { t } = useI18n()
const { activeLocale } = useLocale()
const isCard = computed(() => props.rule.destination_type === 'credit_card')
const needsReview = computed(() => (props.rule.reviewable_occurrence_count ?? 0) > 0)
const destination = computed(() => isCard.value ? cardIdentityLabel(props.rule.credit_card) : props.rule.financial_account?.name)
const detailsId = computed(() => `recurrence-details-${props.rule.id}`)
const detailRows = computed(() => [
  [t('recurringTransactions.descriptionField'), props.rule.description],
  [t('recurringTransactions.criteria.type'), t(`transactions.${props.rule.type}`)],
  [t('recurringTransactions.destination'), t(`recurringTransactions.destinationOptions.${props.rule.destination_type ?? 'financial_account'}`)],
  [isCard.value ? t('recurringTransactions.creditCard') : t('recurringTransactions.account'), destination.value],
  [t('recurringTransactions.category'), props.rule.category?.name],
  [t('recurringTransactions.amount'), formatRecurrenceAmount(props.rule, activeLocale.value)],
  [t('recurringTransactions.frequency'), frequencyLabel(props.rule.frequency, t)],
  [t('recurringTransactions.startDate'), formatRecurrenceDate(props.rule.start_date, activeLocale.value)],
  [t('recurringTransactions.endDate'), props.rule.end_date ? formatRecurrenceDate(props.rule.end_date, activeLocale.value) : '—'],
  [t('recurringTransactions.nextExpected'), nextExpectedLabel(props.rule, t, activeLocale.value)],
  ...(isCard.value ? [[t('recurringTransactions.generationMode'), t(`recurringTransactions.generationModeOptions.${props.rule.generation_mode}`)]] : []),
  [t('recurringTransactions.criteria.state'), stateLabel(props.rule, t)],
])
</script>

<template>
  <li class="border-l-4 py-3 pl-3 pr-4 sm:pl-4 sm:pr-5" :class="needsReview ? 'border-l-[var(--color-warning)]' : 'border-l-transparent'" data-test="recurrence-item">
    <div class="flex items-start gap-3">
      <div class="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]" aria-hidden="true">
        <ElIcon :size="18"><CreditCard v-if="isCard" /><Wallet v-else /></ElIcon>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <button type="button" class="min-w-0 rounded text-left font-semibold text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            :aria-expanded="expanded" :aria-controls="expanded ? detailsId : undefined"
            :aria-label="t('recurringTransactions.toggleDetails', { description: rule.description })"
            data-test="recurrence-toggle" @click="emit('toggle')">
            <span class="inline-flex items-center gap-1.5"><span class="break-words">{{ rule.description }}</span><ElIcon class="text-[var(--color-text-muted)]" :class="expanded ? 'rotate-180' : ''"><ArrowDown /></ElIcon></span>
          </button>
          <span class="whitespace-nowrap font-semibold tabular-nums" :class="rule.type === 'income' ? 'text-[var(--color-financial-positive)]' : 'text-[var(--color-financial-negative)]'" data-test="recurrence-amount">
            {{ rule.type === 'income' ? '+' : '−' }} {{ formatRecurrenceAmount(rule, activeLocale) }}
          </span>
        </div>
        <p class="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-[var(--color-text-muted)]">
          <span data-test="recurrence-destination">{{ destination }}</span><span v-if="destination && rule.category?.name" aria-hidden="true">·</span><span data-test="recurrence-category">{{ rule.category?.name }}</span>
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-[var(--color-text-muted)] sm:text-sm">
          <span data-test="recurrence-frequency">{{ frequencyLabel(rule.frequency, t) }}</span><span aria-hidden="true">·</span>
          <span data-test="recurrence-next">{{ t('recurringTransactions.nextExpected') }} {{ nextExpectedLabel(rule, t, activeLocale) }}</span>
          <ElTag :type="rule.state === 'active' ? 'success' : 'info'" effect="plain" size="small" data-test="recurrence-state">{{ stateLabel(rule, t) }}</ElTag>
        </div>
        <p v-if="rule.paused_reason === 'association_archived'" class="mt-2 text-xs text-[var(--color-text-muted)]" data-test="recurrence-repair-hint">{{ t('recurringTransactions.repairAssociation') }}</p>
        <div v-if="needsReview" class="mt-2 flex flex-wrap items-center gap-2 text-sm" data-test="recurrence-attention">
          <ElTag type="warning" effect="plain" size="small" data-test="recurrence-needs-review"><ElIcon class="mr-1"><Warning /></ElIcon>{{ t('recurringTransactions.reviewRequired') }}</ElTag>
          <span class="text-[var(--color-text-muted)]">{{ t(rule.reviewable_occurrence_count === 1 ? 'recurringTransactions.reviewCountOne' : 'recurringTransactions.reviewCountMany', { count: rule.reviewable_occurrence_count }) }}</span>
          <ElButton link type="warning" :icon="ArrowRight" :loading="reviewLoading" data-test="recurrence-review" @click="emit('review')">{{ t('recurringTransactions.occurrenceReview') }}</ElButton>
        </div>
      </div>
      <RecurringTransactionRowActions :rule="rule" :saving="saving"
        @edit="emit('edit', $event)" @pause="emit('pause', $event)" @resume="emit('resume', $event)" @end="emit('end', $event)" />
    </div>
    <div v-if="expanded" :id="detailsId" role="region" :aria-label="t('recurringTransactions.toggleDetails', { description: rule.description })"
      class="mt-3 border-t border-[var(--color-border)] pt-3 pl-12" data-test="recurrence-expanded">
      <h3 class="mb-2 text-sm font-semibold">{{ t('recurringTransactions.details') }}</h3>
      <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="[label, value] in detailRows" :key="label" class="min-w-0"><dt class="text-xs text-[var(--color-text-muted)]">{{ label }}</dt><dd class="break-words">{{ value ?? '—' }}</dd></div>
      </dl>
      <div v-if="needsReview" class="mt-3 border-t border-[var(--color-border)] pt-3" data-test="recurrence-review-preview">
        <h4 class="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-warning)]"><ElIcon><Warning /></ElIcon>{{ t('recurringTransactions.reviewRequired') }}</h4>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">{{ t('recurringTransactions.reviewExplanation') }}</p>
        <p v-if="reviewLoading" class="mt-1 text-sm text-[var(--color-text-muted)]">{{ t('common.loading') }}</p>
        <dl v-else-if="reviewPreview" class="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div><dt class="text-xs text-[var(--color-text-muted)]">{{ t('recurringTransactions.scheduledDate') }}</dt><dd>{{ formatRecurrenceDate(reviewPreview.scheduled_date, activeLocale) }}</dd></div>
          <div><dt class="text-xs text-[var(--color-text-muted)]">{{ t('recurringTransactions.expectedAmount') }}</dt><dd>{{ formatCentavos(reviewPreview.scheduled_amount_centavos, activeLocale) }}</dd></div>
          <div><dt class="text-xs text-[var(--color-text-muted)]">{{ t('recurringTransactions.occurrenceStatus') }}</dt><dd>{{ cardOccurrenceStateLabel(reviewPreview.state, t) }}</dd></div>
        </dl>
      </div>
      <ElButton class="mt-3" size="small" @click="emit('view-history')">{{ t('recurringTransactions.viewAllOccurrences') }}</ElButton>
    </div>
  </li>
</template>
