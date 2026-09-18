<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatDashboardCurrency,
  formatDashboardMovementAmount,
} from '@/utils/dashboard/dashboardFormatters'

const props = defineProps({
  evolution: {
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

const intervals = computed(() => props.evolution?.intervals ?? [])
const intervalLabel = computed(() =>
  props.evolution?.interval ? t(`dashboard.evolution.${props.evolution.interval}`) : '',
)

function income(interval) {
  return formatDashboardMovementAmount(
    interval.income?.amount_centavos ?? 0,
    'income',
    props.locale,
  )
}

function expenses(interval) {
  return formatDashboardMovementAmount(
    interval.expenses?.amount_centavos ?? 0,
    'expense',
    props.locale,
  )
}

function result(interval) {
  return formatDashboardCurrency(interval.result?.amount_centavos ?? 0, { locale: props.locale })
}
</script>

<template>
  <section class="dashboard-card" aria-labelledby="dashboard-evolution-title">
    <header class="card-header">
      <h2 id="dashboard-evolution-title" class="card-title">
        {{ t('dashboard.evolution.title') }}
      </h2>
      <p v-if="intervalLabel" class="card-meta" data-test="dashboard-evolution-interval">
        {{ t('dashboard.evolution.interval') }}: {{ intervalLabel }}
      </p>
    </header>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="t('dashboard.states.error', { section: t('dashboard.sectionNames.evolution') })"
      data-test="dashboard-evolution-error"
    >
      <ElButton size="small" data-test="dashboard-evolution-retry" @click="emit('retry')">
        {{ t('dashboard.states.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton v-else-if="loading && !evolution" :rows="3" animated />

    <p v-else-if="intervals.length === 0" class="card-empty" data-test="dashboard-evolution-empty">
      {{ t('dashboard.evolution.empty') }}
    </p>

    <div
      v-else
      class="evolution-table-scroll"
      role="region"
      :aria-label="t('dashboard.evolution.title')"
      tabindex="0"
      data-test="dashboard-evolution-table-scroll"
    >
      <table class="evolution-table">
        <caption class="visually-hidden">
          {{
            t('dashboard.evolution.table')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('dashboard.evolution.interval') }}</th>
            <th scope="col">{{ t('dashboard.evolution.income') }}</th>
            <th scope="col">{{ t('dashboard.evolution.expenses') }}</th>
            <th scope="col">{{ t('dashboard.evolution.result') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="interval in intervals"
            :key="`${interval.from}-${interval.to}`"
            data-test="dashboard-evolution-row"
          >
            <th scope="row" class="interval-cell">
              <span>{{ interval.label }}</span>
              <ElTag
                v-if="interval.is_partial"
                size="small"
                type="warning"
                data-test="dashboard-evolution-partial"
              >
                {{ t('dashboard.evolution.partial') }}
              </ElTag>
            </th>
            <td class="amount-cell financial-positive" data-test="dashboard-evolution-income">
              {{ income(interval) }}
            </td>
            <td class="amount-cell financial-negative" data-test="dashboard-evolution-expenses">
              {{ expenses(interval) }}
            </td>
            <td
              class="amount-cell"
              :class="`result-${interval.result?.amount_centavos >= 0 ? 'positive' : 'negative'}`"
              data-test="dashboard-evolution-result"
            >
              {{ result(interval) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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

.evolution-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.evolution-table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.evolution-table th,
.evolution-table td {
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.interval-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-weight: 600;
}

.amount-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.financial-positive,
.result-positive {
  color: var(--color-financial-positive);
}

.financial-negative,
.result-negative {
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
