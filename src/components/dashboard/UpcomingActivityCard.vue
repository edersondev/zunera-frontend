<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardIdentityLabel } from '@/utils/credit-cards/creditCardFormatters'
import {
  formatDashboardDate,
  formatDashboardMovementAmount,
} from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({
  upcoming: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Object,
    default: null,
  },
  locale: {
    type: String,
    default: 'pt-BR',
  },
})

const emit = defineEmits(['retry'])
const { t } = useI18n()

const items = computed(() => props.upcoming?.items ?? [])
const horizon = computed(() => {
  const meta = props.upcoming?.meta

  if (!meta?.from || !meta?.to) return ''

  return t('dashboard.upcoming.horizon', {
    from: formatDashboardDate(meta.from, props.locale),
    to: formatDashboardDate(meta.to, props.locale),
  })
})

function sourceLabel(item) {
  if (item.source_kind === 'card_expectation') return t('dashboard.upcoming.cardExpectation')
  if (item.source_kind === 'recurring_occurrence') return t('dashboard.upcoming.recurringOccurrence')

  return t('dashboard.upcoming.pendingTransaction')
}

function typeLabel(item) {
  return t(`dashboard.recent.${item.type}`)
}

function destinationLabel(item) {
  return item.source_kind === 'card_expectation'
    ? cardIdentityLabel(item.credit_card)
    : item.account?.name ?? '—'
}
</script>

<template>
  <section class="dashboard-card" aria-labelledby="dashboard-upcoming-title">
    <header class="card-header">
      <h2 id="dashboard-upcoming-title" class="card-title">{{ t('dashboard.upcoming.title') }}</h2>
      <p v-if="horizon" class="card-meta" data-test="dashboard-upcoming-horizon">{{ horizon }}</p>
    </header>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="t('dashboard.states.error', { section: t('dashboard.sectionNames.upcoming') })"
      data-test="dashboard-upcoming-error"
    >
      <ElButton size="small" data-test="dashboard-upcoming-retry" @click="emit('retry')">
        {{ t('dashboard.states.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton v-else-if="loading && !upcoming" :rows="3" animated />

    <p v-else-if="items.length === 0" class="card-empty" data-test="dashboard-upcoming-empty">
      {{ t('dashboard.upcoming.empty') }}
    </p>

    <ul v-else class="activity-list" data-test="dashboard-upcoming-list">
      <li
        v-for="item in items"
        :key="`${item.source_kind}-${item.expected_date}-${item.description}`"
        class="activity-row"
        data-test="dashboard-upcoming-row"
      >
        <div class="activity-field date-field">
          <span class="field-label">{{ t('dashboard.upcoming.date') }}</span>
          <span data-test="dashboard-upcoming-date">
            {{ formatDashboardDate(item.expected_date, locale) }}
          </span>
        </div>
        <div class="activity-field description-field">
          <span class="field-label">{{ t('dashboard.upcoming.expected') }}</span>
          <span class="source-kind" data-test="dashboard-upcoming-source">{{ sourceLabel(item) }}</span>
          <span class="movement-type" data-test="dashboard-upcoming-type">{{ typeLabel(item) }}</span>
          <span data-test="dashboard-upcoming-description">{{ item.description }}</span>
        </div>
        <div class="activity-field">
          <span class="field-label">{{ t('dashboard.upcoming.account') }}</span>
          <span>{{ destinationLabel(item) }}</span>
        </div>
        <div class="activity-field">
          <span class="field-label">{{ t('dashboard.upcoming.category') }}</span>
          <span>{{ item.category?.name ?? '—' }}</span>
        </div>
        <div
          class="activity-field amount-cell"
          :class="item.type === 'income' ? 'financial-positive' : 'financial-negative'"
          data-test="dashboard-upcoming-amount"
        >
          <span class="field-label">{{ t('dashboard.upcoming.amount') }}</span>
          {{ formatDashboardMovementAmount(item.amount?.amount_centavos ?? 0, item.type, locale) }}
        </div>
      </li>
    </ul>

    <p v-if="!error" class="card-note" data-test="dashboard-upcoming-note">
      {{ t('dashboard.upcoming.note') }}
    </p>
  </section>
</template>

<style scoped>
.dashboard-card {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}

.card-meta,
.card-empty,
.card-note {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.activity-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity-row {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.activity-field {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.field-label {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.source-kind,
.movement-type {
  display: block;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}

.amount-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.financial-positive {
  color: var(--color-financial-positive);
}

.financial-negative {
  color: var(--color-financial-negative);
}

@media (min-width: 800px) {
  .activity-row {
    grid-template-columns: minmax(100px, 0.7fr) minmax(180px, 1.5fr) minmax(100px, 1fr) minmax(100px, 1fr) auto;
    align-items: start;
  }

  .field-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .amount-cell {
    justify-items: end;
  }
}
</style>
