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

    <table v-else class="accounts-table">
      <caption class="visually-hidden">
        {{
          t('dashboard.accounts.title')
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t('dashboard.recent.account') }}</th>
          <th scope="col">{{ t('dashboard.accounts.balance') }}</th>
          <th scope="col">{{ t('dashboard.accounts.allocation') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.account.id" data-test="dashboard-accounts-row">
          <th scope="row" class="account-cell">
            <span>{{ item.account.name }}</span>
            <ElTag v-if="item.account.status === 'archived'" size="small" type="info">
              {{ t('dashboard.distribution.archived') }}
            </ElTag>
          </th>
          <td class="amount-cell" data-test="dashboard-accounts-balance">{{ balance(item) }}</td>
          <td class="amount-cell" data-test="dashboard-accounts-allocation">
            {{ allocation(item) }}
          </td>
        </tr>
      </tbody>
    </table>

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

.accounts-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.accounts-table th,
.accounts-table td {
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.account-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.amount-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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
