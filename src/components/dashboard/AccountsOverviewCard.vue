<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatDashboardCurrency,
  formatDashboardPercent,
} from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({
  accounts: {
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

const emit = defineEmits(['retry', 'create-account'])
const { t } = useI18n()

const items = computed(() => props.accounts?.accounts ?? [])
const total = computed(() =>
  formatDashboardCurrency(props.accounts?.current_total_balance?.amount_centavos ?? 0, {
    locale: props.locale,
  }),
)

function balance(item) {
  return formatDashboardCurrency(item.current_balance?.amount_centavos ?? 0, {
    locale: props.locale,
  })
}

function allocation(item) {
  if (item.allocation_percent === null || item.allocation_percent === undefined) {
    return t('dashboard.accounts.allocationUnavailable')
  }

  return formatDashboardPercent(item.allocation_percent, props.locale)
}

function hasAllocationIndicator(item) {
  return Number.isFinite(item.allocation_percent)
    && item.allocation_percent >= 0
    && item.allocation_percent <= 100
}
</script>

<template>
  <section class="dashboard-card" aria-labelledby="dashboard-accounts-title">
    <header class="card-header">
      <h2 id="dashboard-accounts-title" class="card-title">{{ t('dashboard.accounts.title') }}</h2>
      <p v-if="accounts" class="card-meta" data-test="dashboard-accounts-total">
        {{ t('dashboard.accounts.total') }}: {{ total }}
      </p>
    </header>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="t('dashboard.states.error', { section: t('dashboard.sectionNames.accounts') })"
      data-test="dashboard-accounts-error"
    >
      <ElButton size="small" data-test="dashboard-accounts-retry" @click="emit('retry')">
        {{ t('dashboard.states.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton v-else-if="loading && !accounts" :rows="3" animated />

    <div v-else-if="items.length === 0" class="empty-state" data-test="dashboard-accounts-empty">
      <ElEmpty :description="t('dashboard.accounts.empty')">
        <ElButton type="primary" @click="emit('create-account')">
          {{ t('dashboard.accounts.emptyAction') }}
        </ElButton>
      </ElEmpty>
    </div>

    <ul v-else class="accounts-list">
      <li v-for="item in items" :key="item.account.id" class="account-row" data-test="dashboard-accounts-row">
        <div class="account-heading">
          <span class="account-name">{{ item.account.name }}</span>
          <ElTag v-if="item.account.status === 'archived'" size="small" type="info">
            {{ t('dashboard.distribution.archived') }}
          </ElTag>
          <span class="amount-cell" data-test="dashboard-accounts-balance">{{ balance(item) }}</span>
        </div>

        <div class="allocation-row">
          <div
            v-if="hasAllocationIndicator(item)"
            class="allocation-track"
            role="progressbar"
            :aria-label="t('dashboard.accounts.allocation')"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="item.allocation_percent"
            :aria-valuetext="allocation(item)"
          >
            <span
              class="allocation-fill"
              :style="{ width: `${item.allocation_percent}%` }"
            />
          </div>
          <span class="amount-cell allocation-value" data-test="dashboard-accounts-allocation">
            {{ allocation(item) }}
          </span>
        </div>
      </li>
    </ul>

    <p v-if="!error" class="card-note">{{ t('dashboard.accounts.allocationHint') }}</p>
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
.card-note {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.accounts-list {
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.account-row {
  display: grid;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.account-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.account-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-heading .amount-cell {
  margin-left: auto;
  font-weight: 600;
}

.allocation-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.allocation-track {
  min-width: 0;
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-surface-tertiary);
}

.allocation-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-action-primary);
}

.amount-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.allocation-value {
  min-width: 52px;
  text-align: right;
}
</style>
