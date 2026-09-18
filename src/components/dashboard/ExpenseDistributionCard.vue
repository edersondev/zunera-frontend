<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatDashboardCurrency,
  formatDashboardPercent,
} from '@/utils/dashboard/dashboardFormatters'
import ExpenseCategoryChart from '@/components/charts/ExpenseCategoryChart.vue'

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

    <template v-else>
      <ExpenseCategoryChart :categories="categories" :locale="locale" />

      <section class="category-breakdown" :aria-label="t('dashboard.distribution.breakdown')">
        <h3 class="breakdown-title">{{ t('dashboard.distribution.breakdown') }}</h3>
        <ul class="category-list">
          <li
            v-for="entry in categories"
            :key="entry.category.id"
            class="category-row"
            data-test="dashboard-distribution-row"
          >
            <div class="category-details">
              <span class="category-name">{{ entry.category.name }}</span>
              <ElTag v-if="entry.category.status === 'archived'" size="small" type="info">
                {{ t('dashboard.distribution.archived') }}
              </ElTag>
            </div>
            <span class="category-share" data-test="dashboard-distribution-share">
              {{ share(entry.share_percent) }}
            </span>
            <span class="amount-cell" data-test="dashboard-distribution-amount">
              {{ money(entry.total?.amount_centavos ?? 0) }}
            </span>
          </li>
        </ul>
      </section>
    </template>
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

.amount-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.category-breakdown {
  display: grid;
  gap: 8px;
}

.breakdown-title {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.category-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.category-details {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.category-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-share {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 479px) {
  .category-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .category-share {
    grid-column: 2;
    grid-row: 1;
  }

  .amount-cell {
    grid-column: 1;
  }
}
</style>
