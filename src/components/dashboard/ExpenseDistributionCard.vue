<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatDashboardCurrency,
  formatDashboardPercent,
} from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({
  distribution: {
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

const categories = computed(() => props.distribution?.categories ?? [])
const isEmpty = computed(() => categories.value.length === 0)

function money(amountCentavos) {
  return formatDashboardCurrency(amountCentavos, { locale: props.locale })
}

function share(value) {
  return formatDashboardPercent(value, props.locale)
}
</script>

<template>
  <section class="dashboard-card" aria-labelledby="dashboard-distribution-title">
    <header class="card-header">
      <h2 id="dashboard-distribution-title" class="card-title">
        {{ t('dashboard.distribution.title') }}
      </h2>
      <p v-if="distribution" class="card-meta" data-test="dashboard-distribution-total">
        {{ t('dashboard.distribution.total') }}:
        {{ money(distribution.total_expenses?.amount_centavos ?? 0) }}
      </p>
    </header>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="t('dashboard.states.error', { section: t('dashboard.sectionNames.distribution') })"
      data-test="dashboard-distribution-error"
    >
      <ElButton size="small" data-test="dashboard-distribution-retry" @click="emit('retry')">
        {{ t('dashboard.states.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton v-else-if="loading && !distribution" :rows="3" animated />

    <p v-else-if="isEmpty" class="card-empty" data-test="dashboard-distribution-empty">
      {{ t('dashboard.distribution.empty') }}
    </p>

    <table v-else class="distribution-table">
      <caption class="visually-hidden">
        {{
          t('dashboard.distribution.table')
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t('dashboard.distribution.rank') }}</th>
          <th scope="col">{{ t('dashboard.distribution.category') }}</th>
          <th scope="col">{{ t('dashboard.distribution.share') }}</th>
          <th scope="col">{{ t('dashboard.distribution.amount') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="entry in categories"
          :key="entry.category.id"
          data-test="dashboard-distribution-row"
        >
          <td data-test="dashboard-distribution-rank">{{ entry.rank }}</td>
          <td>
            <span class="category-name">{{ entry.category.name }}</span>
            <ElTag v-if="entry.category.status === 'archived'" size="small" type="info">
              {{ t('dashboard.distribution.archived') }}
            </ElTag>
          </td>
          <td data-test="dashboard-distribution-share">
            {{ share(entry.share_percent) }}
            <span class="share-bar" aria-hidden="true">
              <span
                class="share-bar-fill"
                :style="{ width: `${Math.min(100, Math.max(0, entry.share_percent))}%` }"
              />
            </span>
          </td>
          <td class="amount-cell" data-test="dashboard-distribution-amount">
            {{ money(entry.total?.amount_centavos ?? 0) }}
          </td>
        </tr>
      </tbody>
    </table>
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

.distribution-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.distribution-table th,
.distribution-table td {
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: middle;
}

.amount-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.category-name {
  margin-right: 8px;
}

.share-bar {
  display: block;
  width: 96px;
  height: 6px;
  margin-top: 4px;
  border-radius: var(--radius-full);
  background: var(--color-surface-tertiary);
}

.share-bar-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-action-primary);
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
