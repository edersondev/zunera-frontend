<script setup>
import { computed } from 'vue'
import { ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import CreditCardUtilizationProgress from './CreditCardUtilizationProgress.vue'
import {
  formatBRL,
  formatIsoDate,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  card: { type: Object, required: true },
  locale: { type: String, default: 'pt-BR' },
})

const { t } = useI18n()

const statement = computed(() => props.card.current_statement ?? null)
const usedCentavos = computed(() => props.card.summary?.used_credit?.amount_centavos ?? 0)
const limitCentavos = computed(() => props.card.summary?.credit_limit?.amount_centavos ?? 0)
const availableCentavos = computed(() => props.card.summary?.available_credit?.amount_centavos ?? 0)
const outstandingCentavos = computed(
  () => statement.value?.outstanding_amount?.amount_centavos ?? 0,
)
const hasOutstandingBalance = computed(() => outstandingCentavos.value > 0)
const hasConcreteStatement = computed(
  () => statement.value?.id !== null && statement.value?.id !== undefined,
)
const status = computed(() => statementStatus(statement.value?.status))
const shouldShowStatus = computed(() => hasOutstandingBalance.value || hasConcreteStatement.value)
const statementAmount = computed(() =>
  hasOutstandingBalance.value
    ? outstandingCentavos.value
    : (statement.value?.net_amount?.amount_centavos ?? 0),
)
const institution = computed(() => {
  const name = String(props.card.name ?? '')
    .trim()
    .toLocaleLowerCase(props.locale)
  const value = String(props.card.institution_name ?? '').trim()

  return value && value.toLocaleLowerCase(props.locale) !== name ? value : ''
})
const lastFour = computed(() => String(props.card.last_four ?? '').trim())
</script>

<template>
  <article class="credit-card-overview" :data-test="`dashboard-credit-card-${props.card.id}`">
    <header class="credit-card-header">
      <div class="credit-card-heading">
        <h3 class="credit-card-name">{{ props.card.name }}</h3>
        <p v-if="institution" class="credit-card-institution">{{ institution }}</p>
      </div>
      <ElTag v-if="props.card.summary?.is_over_limit" type="danger" size="small">
        {{ t('creditCards.summary.overLimitTag') }}
      </ElTag>
    </header>

    <p v-if="lastFour" class="credit-card-last-four">•••• {{ lastFour }}</p>

    <section
      class="credit-card-statement"
      :aria-label="t('creditCards.dashboard.currentStatement')"
    >
      <p class="credit-card-statement-label">{{ t('creditCards.dashboard.currentStatement') }}</p>
      <p v-if="hasOutstandingBalance || hasConcreteStatement" class="credit-card-statement-value">
        {{ formatBRL(statementAmount, props.locale) }}
      </p>
      <p v-else class="credit-card-zero-state">
        {{ t('creditCards.dashboard.noOutstandingBalance') }}
      </p>

      <div v-if="shouldShowStatus" class="credit-card-statement-meta">
        <span v-if="hasOutstandingBalance && statement?.due_date" class="credit-card-due-date">
          {{
            t('creditCards.dashboard.dueOn', {
              date: formatIsoDate(statement.due_date, props.locale),
            })
          }}
        </span>
        <span v-else-if="!hasOutstandingBalance" class="credit-card-zero-state">
          {{ t('creditCards.dashboard.noOutstandingBalance') }}
        </span>
        <ElTag :type="status.tone" size="small">{{ t(status.labelKey) }}</ElTag>
      </div>
    </section>

    <CreditCardUtilizationProgress
      :used-centavos="usedCentavos"
      :limit-centavos="limitCentavos"
      :available-centavos="availableCentavos"
      :locale="props.locale"
      :label="t('creditCards.dashboard.cardUtilization')"
      :is-over-limit="Boolean(props.card.summary?.is_over_limit)"
    />

    <dl class="credit-card-balances">
      <div>
        <dt>{{ t('creditCards.summary.available') }}</dt>
        <dd>{{ formatBRL(availableCentavos, props.locale) }}</dd>
      </div>
      <div>
        <dt>{{ t('creditCards.summary.limit') }}</dt>
        <dd>{{ formatBRL(limitCentavos, props.locale) }}</dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
.credit-card-overview {
  display: grid;
  gap: 16px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
}

.credit-card-header,
.credit-card-statement-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.credit-card-heading,
.credit-card-statement,
.credit-card-balances > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.credit-card-name,
.credit-card-institution,
.credit-card-last-four,
.credit-card-statement-label,
.credit-card-statement-value,
.credit-card-zero-state,
.credit-card-due-date,
.credit-card-balances dt,
.credit-card-balances dd {
  margin: 0;
}

.credit-card-name {
  overflow: hidden;
  color: var(--color-text);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.credit-card-institution,
.credit-card-last-four,
.credit-card-statement-label,
.credit-card-zero-state,
.credit-card-due-date,
.credit-card-balances dt {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}

.credit-card-statement-value {
  color: var(--color-text);
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 32px;
}

.credit-card-balances {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.credit-card-balances dd {
  color: var(--color-text);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 20px;
}
</style>
