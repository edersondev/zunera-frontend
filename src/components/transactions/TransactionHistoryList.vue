<script setup>
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ExpandableHistoryItem from './ExpandableHistoryItem.vue'
import { formatTransactionDate } from '@/utils/transactions/transactionFormatters'

const props = defineProps({
  items: { type: Array, required: true },
  meta: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  loading: Boolean,
  transactionSaving: Boolean,
  transferSaving: Boolean,
  hasMore: Boolean,
  filtered: Boolean,
  emptyKind: { type: String, default: 'period' },
  resetKey: { type: String, default: '' },
})
const emit = defineEmits(['select', 'edit-transaction', 'edit-transfer', 'update-transaction-status', 'update-transfer-status', 'remove-transaction', 'remove-transfer', 'load-more', 'clear-filters', 'create'])
const { t } = useI18n()
const expandedKey = shallowRef(null)
const categoryMap = computed(() => new Map(props.categories.map((category) => [category.id, category])))
const groups = computed(() => {
  const result = []
  for (const item of props.items) {
    const date = item.movement_date ?? item.transaction_date
    let group = result[result.length - 1]
    if (!group || group.date !== date) {
      group = { date, items: [] }
      result.push(group)
    }
    group.items.push(item)
  }

  return result
})

function movementKey(row) {
  return `${row.movement_kind ?? row.type ?? 'expense'}-${row.id}`
}

function toggle(key) {
  expandedKey.value = expandedKey.value === key ? null : key
}

watch(() => props.resetKey, () => { expandedKey.value = null })
watch(() => props.items, (items) => {
  if (expandedKey.value && !items.some((row) => movementKey(row) === expandedKey.value)) {
    expandedKey.value = null
  }
})
</script>

<template>
  <section class="history" aria-labelledby="transactions-title">
    <header class="history-header">
      <div>
        <h2 id="transactions-title" data-test="transaction-count">{{ t('transactions.count', { count: meta.total ?? 0 }) }}</h2>
        <p v-if="items.length" class="history-meta" data-test="transaction-loaded-count">{{ t('transactions.showing', { loaded: items.length, total: meta.total ?? items.length }) }}</p>
      </div>
    </header>

    <ElSkeleton v-if="loading && items.length === 0" :rows="5" animated />
    <template v-else-if="items.length">
      <div class="date-groups" data-test="transaction-history-list">
        <section v-for="group in groups" :key="group.date" class="date-group" :data-test="`transaction-date-${group.date}`">
          <h3 class="date-heading">{{ formatTransactionDate(group.date) }}</h3>
          <ul class="group-items">
            <ExpandableHistoryItem
              v-for="row in group.items"
              :key="movementKey(row)"
              :row="row"
              :category-definition="categoryMap.get(row.category?.id) ?? null"
              :expanded="expandedKey === movementKey(row)"
              :transaction-saving="transactionSaving"
              :transfer-saving="transferSaving"
              @toggle="toggle"
              @select="emit('select', $event)"
              @edit-transaction="emit('edit-transaction', $event)"
              @edit-transfer="emit('edit-transfer', $event)"
              @update-transaction-status="(transaction, status) => emit('update-transaction-status', transaction, status)"
              @update-transfer-status="(transfer, status) => emit('update-transfer-status', transfer, status)"
              @remove-transaction="emit('remove-transaction', $event)"
              @remove-transfer="emit('remove-transfer', $event)"
            />
          </ul>
        </section>
      </div>
    </template>

    <ElEmpty
      v-else
      :image-size="64"
      :description="t(filtered ? 'transactions.noMatch' : emptyKind === 'none' ? 'transactions.empty' : 'transactions.emptyPeriod')"
      data-test="transaction-empty"
    >
      <ElButton v-if="filtered" data-test="empty-clear-filters" @click="emit('clear-filters')">{{ t('transactions.clear') }}</ElButton>
      <ElButton v-else-if="emptyKind === 'none'" type="primary" data-test="empty-create-transaction" @click="emit('create')">{{ t('transactions.new') }}</ElButton>
    </ElEmpty>

    <div class="more"><ElButton v-if="hasMore" :loading="loading" data-test="load-more" @click="emit('load-more')">{{ t('transactions.loadMore') }}</ElButton></div>
  </section>
</template>

<style scoped>
.history { display: grid; gap: 12px; min-width: 0; }
.history-header h2, .history-meta { margin: 0; }
.history-header h2 { color: var(--color-text); font-size: 20px; line-height: 28px; }
.history-meta { color: var(--color-text-muted); font-size: 13px; line-height: 20px; }
.date-groups { display: grid; gap: 20px; }
.date-group { min-width: 0; }
.date-heading { margin: 0 0 8px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border); color: var(--color-text-subtle); font-size: 14px; font-weight: 600; line-height: 20px; }
.group-items { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.more { display: flex; justify-content: center; }
</style>
