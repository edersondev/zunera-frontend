<script setup>
import { useI18n } from 'vue-i18n'
import RecurringTransactionItem from './RecurringTransactionItem.vue'

defineProps({
  rules: { type: Array, required: true },
  loading: Boolean,
  hasMore: Boolean,
  saving: Boolean,
  filtered: Boolean,
  expandedRuleId: { type: Number, default: null },
  reviewPreview: { type: Object, default: null },
  reviewLoadingRuleId: { type: Number, default: null },
})
const emit = defineEmits(['toggle', 'review', 'view-history', 'edit', 'pause', 'resume', 'end', 'load-more', 'clear-filters', 'create'])
const { t } = useI18n()
</script>

<template>
  <section data-test="recurrence-list" :aria-label="t('recurringTransactions.title')">
    <div v-if="loading && !rules.length" class="rounded-xl border border-[var(--color-border)] p-4" data-test="recurrence-loading">
      <ElSkeleton :rows="4" animated />
    </div>
    <div v-else-if="!rules.length" class="rounded-xl border border-[var(--color-border)] py-7 text-center">
      <ElEmpty :description="t(filtered ? 'recurringTransactions.noMatch' : 'recurringTransactions.empty')">
        <ElButton v-if="filtered" @click="emit('clear-filters')">{{ t('recurringTransactions.clear') }}</ElButton>
        <ElButton v-else type="primary" @click="emit('create')">{{ t('recurringTransactions.new') }}</ElButton>
      </ElEmpty>
    </div>
    <ul v-else class="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" data-test="recurrence-items">
      <RecurringTransactionItem
        v-for="rule in rules"
        :key="rule.id"
        :rule="rule"
        :expanded="expandedRuleId === rule.id"
        :review-preview="expandedRuleId === rule.id ? reviewPreview : null"
        :review-loading="reviewLoadingRuleId === rule.id"
        :saving="saving"
        @toggle="emit('toggle', rule)"
        @review="emit('review', rule)"
        @view-history="emit('view-history', rule)"
        @edit="emit('edit', $event)"
        @pause="emit('pause', $event)"
        @resume="emit('resume', $event)"
        @end="emit('end', $event)"
      />
    </ul>
    <div v-if="loading && rules.length" class="mt-3 text-sm text-[var(--color-text-muted)]" data-test="recurrence-loading">{{ t('common.loading') }}</div>
    <div v-if="hasMore" class="mt-4 text-center">
      <ElButton data-test="recurrence-load-more" :loading="loading" @click="emit('load-more')">{{ t('recurringTransactions.loadMore') }}</ElButton>
    </div>
  </section>
</template>
