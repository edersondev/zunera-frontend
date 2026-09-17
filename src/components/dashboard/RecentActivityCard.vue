<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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

    <table v-else class="recent-table">
      <caption class="visually-hidden">
        {{
          t('dashboard.recent.title')
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t('dashboard.recent.date') }}</th>
          <th scope="col">{{ t('dashboard.recent.description') }}</th>
          <th scope="col">{{ t('dashboard.recent.category') }}</th>
          <th scope="col">{{ t('dashboard.recent.account') }}</th>
          <th scope="col">{{ t('dashboard.recent.amount') }}</th>
          <th scope="col">{{ t('dashboard.recent.status') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="movement in movements"
          :key="`${movement.movement_kind}-${movement.id}`"
          data-test="dashboard-recent-row"
        >
          <td data-test="dashboard-recent-date">
            {{ formatDashboardDate(movement.movement_date, locale) }}
          </td>
          <td>
            <span class="movement-kind">{{ movementKindLabel(movement.movement_kind) }}</span>
            <span data-test="dashboard-recent-description">{{ movement.description || '—' }}</span>
            <span
              v-if="movement.recurrence_source"
              class="recurrence-source"
              data-test="dashboard-recent-recurrence"
            >
              {{ t('dashboard.recent.recurrenceSource', { id: movement.recurrence_source.id }) }}
            </span>
          </td>
          <td data-test="dashboard-recent-category">{{ categoryLabel(movement) }}</td>
          <td data-test="dashboard-recent-account">{{ accountLabel(movement) }}</td>
          <td class="amount-cell" data-test="dashboard-recent-amount">
            {{ amountLabel(movement) }}
          </td>
          <td data-test="dashboard-recent-status">
            <ElTag :type="movement.status === 'pending' ? 'warning' : 'info'" size="small">
              {{ statusLabel(movement.status) }}
            </ElTag>
          </td>
        </tr>
      </tbody>
    </table>

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

.recent-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.recent-table th,
.recent-table td {
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
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

.history-link {
  color: var(--color-action-primary);
  font-weight: 600;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
