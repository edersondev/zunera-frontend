<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
  return item.source_kind === 'recurring_occurrence'
    ? t('dashboard.upcoming.recurringOccurrence')
    : t('dashboard.upcoming.pendingTransaction')
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

    <div
      v-else
      class="upcoming-table-scroll"
      role="region"
      :aria-label="t('dashboard.upcoming.title')"
      tabindex="0"
      data-test="dashboard-upcoming-table-scroll"
    >
      <table class="upcoming-table">
        <caption class="visually-hidden">
          {{
            t('dashboard.upcoming.title')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('dashboard.upcoming.date') }}</th>
            <th scope="col">{{ t('dashboard.upcoming.expected') }}</th>
            <th scope="col">{{ t('dashboard.upcoming.account') }}</th>
            <th scope="col">{{ t('dashboard.upcoming.category') }}</th>
            <th scope="col">{{ t('dashboard.upcoming.amount') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="`${item.source_kind}-${item.expected_date}-${item.description}`"
            data-test="dashboard-upcoming-row"
          >
            <td data-test="dashboard-upcoming-date">
              {{ formatDashboardDate(item.expected_date, locale) }}
            </td>
            <td>
              <span class="source-kind" data-test="dashboard-upcoming-source">{{
                sourceLabel(item)
              }}</span>
              <span data-test="dashboard-upcoming-description">{{ item.description }}</span>
            </td>
            <td>{{ item.account?.name ?? '—' }}</td>
            <td>{{ item.category?.name ?? '—' }}</td>
            <td
              class="amount-cell"
              :class="item.type === 'income' ? 'financial-positive' : 'financial-negative'"
              data-test="dashboard-upcoming-amount"
            >
              {{
                formatDashboardMovementAmount(item.amount?.amount_centavos ?? 0, item.type, locale)
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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

.upcoming-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.upcoming-table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.upcoming-table th,
.upcoming-table td {
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.source-kind {
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

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
