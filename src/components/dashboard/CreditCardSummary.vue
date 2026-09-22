<script setup>
import { computed } from 'vue'
import { CreditCard, Plus, RefreshRight } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import CreditCardOverviewCard from './CreditCardOverviewCard.vue'
import CreditCardUtilizationProgress from './CreditCardUtilizationProgress.vue'
import {
  availableCreditPresentation,
  formatBRL,
  formatIsoDate,
  statementStatus,
  sumCreditCardSummaryAmount,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  projection: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
})

const emit = defineEmits(['retry', 'open-cards'])
const { t, locale } = useI18n()

const cards = computed(() => props.projection?.cards ?? [])
const upcoming = computed(() => props.projection?.upcoming_statements ?? [])
const usedCentavos = computed(() => sumCreditCardSummaryAmount(cards.value, 'used_credit'))
const totalLimitCentavos = computed(() => sumCreditCardSummaryAmount(cards.value, 'credit_limit'))
const availableCentavos = computed(() => props.projection?.available_credit?.amount_centavos ?? 0)
const available = computed(() => availableCreditPresentation(availableCentavos.value, locale.value))
</script>

<template>
  <section
    class="dashboard-card"
    aria-labelledby="dashboard-credit-cards-title"
    data-test="dashboard-credit-cards"
  >
    <header class="card-header">
      <div class="card-heading">
        <h2 id="dashboard-credit-cards-title" class="card-title">
          {{ t('creditCards.dashboard.title') }}
        </h2>
        <p class="card-description">{{ t('creditCards.dashboard.description') }}</p>
      </div>
      <ElButton
        type="info"
        plain
        :icon="CreditCard"
        data-test="dashboard-credit-cards-link"
        @click="emit('open-cards')"
      >
        {{ t('creditCards.dashboard.manage') }}
      </ElButton>
    </header>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      show-icon
      :title="error.message"
      data-test="dashboard-credit-cards-error"
    >
      <ElButton
        size="small"
        :icon="RefreshRight"
        data-test="dashboard-credit-cards-retry"
        @click="emit('retry')"
      >
        {{ t('common.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton
      v-else-if="loading && !projection"
      :rows="5"
      animated
      data-test="dashboard-credit-cards-loading"
    />

    <div
      v-else-if="cards.length === 0"
      class="empty-state"
      data-test="dashboard-credit-cards-empty"
    >
      <ElEmpty :description="t('creditCards.dashboard.empty')">
        <p class="empty-copy">{{ t('creditCards.dashboard.emptyHint') }}</p>
        <ElButton type="primary" :icon="Plus" @click="emit('open-cards')">
          {{ t('creditCards.dashboard.addCard') }}
        </ElButton>
      </ElEmpty>
    </div>

    <template v-else>
      <dl class="credit-summary-grid" data-test="dashboard-credit-cards-totals">
        <div class="credit-summary-item">
          <dt>{{ t('creditCards.dashboard.outstanding') }}</dt>
          <dd data-test="dashboard-credit-cards-outstanding">
            {{ formatBRL(projection.outstanding_obligation?.amount_centavos ?? 0, locale) }}
          </dd>
        </div>
        <div class="credit-summary-item">
          <dt>{{ t('creditCards.summary.used') }}</dt>
          <dd data-test="dashboard-credit-cards-used">{{ formatBRL(usedCentavos, locale) }}</dd>
        </div>
        <div class="credit-summary-item">
          <dt>{{ t('creditCards.summary.available') }}</dt>
          <dd data-test="dashboard-credit-cards-available">{{ available.formatted }}</dd>
        </div>
        <div class="credit-summary-item">
          <dt>{{ t('creditCards.dashboard.totalLimit') }}</dt>
          <dd data-test="dashboard-credit-cards-total-limit">
            {{ formatBRL(totalLimitCentavos, locale) }}
          </dd>
        </div>
      </dl>

      <CreditCardUtilizationProgress
        :used-centavos="usedCentavos"
        :limit-centavos="totalLimitCentavos"
        :available-centavos="availableCentavos"
        :locale="locale"
        :label="t('creditCards.dashboard.overallUtilization')"
        :is-over-limit="available.isOverLimit"
      />

      <p
        v-if="available.isOverLimit"
        class="over-limit-note"
        data-test="dashboard-credit-cards-over-limit"
      >
        {{ t('creditCards.overLimit', { amount: available.formatted }) }}
      </p>

      <p class="cash-note">{{ t('creditCards.dashboard.cashNote') }}</p>

      <div class="credit-card-grid" data-test="dashboard-credit-cards-grid">
        <CreditCardOverviewCard
          v-for="card in cards"
          :key="card.id"
          :card="card"
          :locale="locale"
        />
      </div>

      <section
        v-if="upcoming.length > 0"
        class="upcoming-statements"
        aria-labelledby="dashboard-credit-cards-upcoming-title"
      >
        <h3 id="dashboard-credit-cards-upcoming-title" class="upcoming-title">
          {{ t('creditCards.dashboard.upcoming') }}
        </h3>
        <ul class="upcoming-list">
          <li
            v-for="statement in upcoming"
            :key="statement.id"
            class="upcoming-row"
            :data-test="`dashboard-credit-card-statement-${statement.id}`"
          >
            <div class="upcoming-card">
              <span class="upcoming-card-name">{{ statement.card.name }}</span>
              <span class="upcoming-due-date">{{
                t('creditCards.dashboard.dueOn', {
                  date: formatIsoDate(statement.due_date, locale),
                })
              }}</span>
            </div>
            <ElTag :type="statementStatus(statement.status).tone" size="small">
              {{ t(statementStatus(statement.status).labelKey) }}
            </ElTag>
            <span class="upcoming-amount">{{
              formatBRL(statement.outstanding_amount.amount_centavos, locale)
            }}</span>
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.card-heading {
  display: grid;
  gap: 4px;
}
.card-title,
.card-description,
.cash-note,
.over-limit-note,
.empty-copy,
.upcoming-title {
  margin: 0;
}
.card-title,
.upcoming-title {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}
.card-description,
.cash-note,
.empty-copy {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}
.credit-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}
.credit-summary-item {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
}
.credit-summary-item dt {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}
.credit-summary-item dd {
  margin: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.over-limit-note {
  color: var(--color-danger);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}
.credit-card-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.upcoming-statements {
  display: grid;
  gap: 12px;
}
.upcoming-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.upcoming-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
}
.upcoming-card {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.upcoming-card-name,
.upcoming-amount {
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}
.upcoming-card-name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upcoming-due-date {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}
.upcoming-amount {
  grid-column: 2;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
.empty-state :deep(.el-empty__description) {
  margin-bottom: 8px;
}
.empty-copy {
  max-width: 320px;
  margin-bottom: 16px;
  text-align: center;
}
@media (min-width: 640px) {
  .credit-summary-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 880px) {
  .credit-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .upcoming-row {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }
  .upcoming-amount {
    grid-column: auto;
  }
}
@media (max-width: 639px) {
  .dashboard-card {
    padding: 16px;
  }
}
</style>
