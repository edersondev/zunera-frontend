<script setup>
import { computed } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  availableCreditPresentation,
  cardIdentityLabel,
  formatBRL,
  formatIsoDate,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  projection: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
})

const emit = defineEmits(['retry', 'open-cards'])
const { t } = useI18n()

const cards = computed(() => props.projection?.cards ?? [])
const upcoming = computed(() => props.projection?.upcoming_statements ?? [])
const available = computed(() =>
  availableCreditPresentation(props.projection?.available_credit?.amount_centavos ?? 0),
)
</script>

<template>
  <section class="credit-card-summary" data-test="dashboard-credit-cards">
    <header class="credit-card-summary__header">
      <h2>{{ t('creditCards.dashboard.title') }}</h2>
      <ElButton size="small" data-test="dashboard-credit-cards-link" @click="emit('open-cards')">
        {{ t('creditCards.dashboard.manage') }}
      </ElButton>
    </header>

    <ElAlert v-if="error" type="error" :closable="false" :title="error.message" data-test="dashboard-credit-cards-error">
      <ElButton size="small" data-test="dashboard-credit-cards-retry" @click="emit('retry')">
        {{ t('common.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton v-else-if="loading" :rows="2" animated data-test="dashboard-credit-cards-loading" />

    <ElEmpty v-else-if="cards.length === 0" :description="t('creditCards.dashboard.empty')" data-test="dashboard-credit-cards-empty" />

    <template v-else>
      <dl class="credit-card-summary__totals" data-test="dashboard-credit-cards-totals">
        <div>
          <dt>{{ t('creditCards.dashboard.outstanding') }}</dt>
          <dd data-test="dashboard-credit-cards-outstanding">
            {{ formatBRL(projection.outstanding_obligation.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt>{{ t('creditCards.summary.cardCredit') }}</dt>
          <dd data-test="dashboard-credit-cards-card-credit">{{ formatBRL(projection.card_credit.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.summary.available') }}</dt>
          <dd data-test="dashboard-credit-cards-available">{{ formatBRL(projection.available_credit.amount_centavos) }}</dd>
        </div>
      </dl>

      <p class="credit-card-summary__note">{{ t('creditCards.dashboard.cashNote') }}</p>

      <p v-if="available.isOverLimit" class="credit-card-summary__over-limit" data-test="dashboard-credit-cards-over-limit">
        {{ t('creditCards.overLimit', { amount: available.formatted }) }}
      </p>

      <ul class="credit-card-summary__cards">
        <li v-for="card in cards" :key="card.id" :data-test="`dashboard-credit-card-${card.id}`">
          <span class="credit-card-summary__name">{{ card.name }}</span>
          <span class="credit-card-summary__muted">{{ cardIdentityLabel(card) }}</span>
          <span data-test="dashboard-credit-card-used">{{ formatBRL(card.summary.used_credit.amount_centavos) }}</span>
          <ElTag v-if="card.summary.is_over_limit" type="danger" size="small">{{ t('creditCards.summary.overLimitTag') }}</ElTag>
        </li>
      </ul>

      <template v-if="upcoming.length > 0">
        <h3 class="credit-card-summary__subtitle">{{ t('creditCards.dashboard.upcoming') }}</h3>
        <ul class="credit-card-summary__cards">
          <li v-for="statement in upcoming" :key="statement.id" :data-test="`dashboard-credit-card-statement-${statement.id}`">
            <span>{{ statement.card.name }}</span>
            <span class="credit-card-summary__muted">{{ formatIsoDate(statement.due_date) }}</span>
            <ElTag :type="statementStatus(statement.status).tone" size="small">
              {{ t(statementStatus(statement.status).labelKey) }}
            </ElTag>
            <span>{{ formatBRL(statement.outstanding_amount.amount_centavos) }}</span>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<style scoped>
.credit-card-summary {
  display: grid;
  gap: 0.5rem;
}

.credit-card-summary__header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
}

.credit-card-summary__header h2,
.credit-card-summary__subtitle {
  margin: 0;
  font-size: 1rem;
}

.credit-card-summary__totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.5rem;
  margin: 0;
}

.credit-card-summary__totals dt {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.credit-card-summary__totals dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.credit-card-summary__note,
.credit-card-summary__muted {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}

.credit-card-summary__over-limit {
  margin: 0;
  font-weight: 600;
  color: var(--el-color-danger);
}

.credit-card-summary__cards {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.credit-card-summary__cards li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5rem;
}

.credit-card-summary__name {
  font-weight: 600;
}
</style>
