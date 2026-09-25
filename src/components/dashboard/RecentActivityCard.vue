<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardIdentityLabel } from '@/utils/credit-cards/creditCardFormatters'
import {
  formatDashboardCurrency,
  formatDashboardDate,
  formatDashboardMovementAmount,
} from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({
  items: {
    type: Array,
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

const movements = computed(() => props.items ?? [])

function movementKindLabel(kind) {
  return t(`dashboard.recent.${kind}`)
}

function statusLabel(status) {
  return status === 'pending' ? t('dashboard.recent.pending') : t('dashboard.recent.effective')
}

function accountLabel(movement) {
  if (movement.movement_kind === 'transfer') {
    return `${movement.source_account?.name ?? '—'} → ${movement.destination_account?.name ?? '—'}`
  }

  if (movement.movement_kind === 'credit_card_expense') {
    return cardIdentityLabel(movement.credit_card)
  }

  return movement.account?.name ?? '—'
}

function categoryLabel(movement) {
  if (movement.movement_kind === 'transfer') {
    return t('dashboard.recent.transfer')
  }

  return movement.category?.name ?? '—'
}

function amountLabel(movement) {
  if (movement.movement_kind === 'transfer') {
    return formatDashboardCurrency(movement.amount?.amount_centavos ?? 0, { locale: props.locale })
  }

  return formatDashboardMovementAmount(
    movement.amount?.amount_centavos ?? 0,
    movement.movement_kind,
    props.locale,
  )
}
</script>

<template>
  <section class="dashboard-card" aria-labelledby="dashboard-recent-title">
    <header class="card-header">
      <h2 id="dashboard-recent-title" class="card-title">{{ t('dashboard.recent.title') }}</h2>
      <p class="card-meta">{{ t('dashboard.recent.limitNote') }}</p>
    </header>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="t('dashboard.states.error', { section: t('dashboard.sectionNames.recent') })"
      data-test="dashboard-recent-error"
    >
      <ElButton size="small" data-test="dashboard-recent-retry" @click="emit('retry')">
        {{ t('dashboard.states.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton v-else-if="loading && !items" :rows="4" animated />

    <p v-else-if="movements.length === 0" class="card-empty" data-test="dashboard-recent-empty">
      {{ t('dashboard.recent.empty') }}
    </p>

    <ul v-else class="activity-list" data-test="dashboard-recent-list">
      <li
        v-for="movement in movements"
        :key="`${movement.movement_kind}-${movement.id}`"
        class="activity-row"
        data-test="dashboard-recent-row"
      >
        <div class="activity-field date-field">
          <span class="field-label">{{ t('dashboard.recent.date') }}</span>
          <span data-test="dashboard-recent-date">
            {{ formatDashboardDate(movement.movement_date, locale) }}
          </span>
        </div>
        <div class="activity-field description-field">
          <span class="field-label">{{ t('dashboard.recent.description') }}</span>
          <span class="movement-kind">{{ movementKindLabel(movement.movement_kind) }}</span>
          <span data-test="dashboard-recent-description">{{ movement.description || '—' }}</span>
          <RouterLink
            v-if="movement.recurrence_source"
            class="recurrence-source"
            :to="{ name: 'recurring-transactions', query: { highlight: movement.recurrence_source.id } }"
            data-test="dashboard-recent-recurrence"
          >
            {{ t('dashboard.recent.recurrenceSource', { id: movement.recurrence_source.id }) }}
          </RouterLink>
        </div>
        <div class="activity-field">
          <span class="field-label">{{ t('dashboard.recent.category') }}</span>
          <span data-test="dashboard-recent-category">{{ categoryLabel(movement) }}</span>
        </div>
        <div class="activity-field">
          <span class="field-label">{{ t('dashboard.recent.account') }}</span>
          <span data-test="dashboard-recent-account">{{ accountLabel(movement) }}</span>
        </div>
        <div
          class="activity-field amount-cell"
          :class="{
            'financial-positive': movement.movement_kind === 'income',
            'financial-negative': ['expense', 'credit_card_expense'].includes(movement.movement_kind),
          }"
          data-test="dashboard-recent-amount"
        >
          <span class="field-label">{{ t('dashboard.recent.amount') }}</span>
          {{ amountLabel(movement) }}
        </div>
        <div class="activity-field status-field" data-test="dashboard-recent-status">
          <span class="field-label">{{ t('dashboard.recent.status') }}</span>
          <ElTag :type="movement.status === 'pending' ? 'warning' : 'info'" size="small">
            {{ statusLabel(movement.status) }}
          </ElTag>
        </div>
      </li>
    </ul>

    <RouterLink
      class="history-link"
      :to="{ name: 'transactions' }"
      data-test="dashboard-recent-history"
    >
      {{ t('dashboard.recent.history') }}
    </RouterLink>
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
.card-empty {
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

.movement-kind,
.recurrence-source {
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

.history-link {
  color: var(--color-action-primary);
  font-weight: 600;
}

.recurrence-source {
  color: var(--color-action-primary);
}

@media (min-width: 960px) {
  .activity-row {
    grid-template-columns: minmax(90px, 0.6fr) minmax(160px, 1.4fr) minmax(110px, 0.9fr) minmax(120px, 1fr) auto auto;
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

  .amount-cell,
  .status-field {
    justify-items: end;
  }
}
</style>
