<script setup>
import { computed, onMounted } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import {
  formatBRL,
  formatIsoDate,
  installmentLabel,
  paymentStatus,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({ statementId: { type: [String, Number], required: true } })
const store = useCreditCardStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const statement = computed(() => store.statement)

onMounted(() => store.fetchStatement(Number(props.statementId ?? route.params.statement_id)))

function goBack() {
  if (store.card) {
    router.push({ name: 'credit-card-detail', params: { card_id: store.card.id } })

    return
  }

  router.push({ name: 'credit-cards' })
}
</script>

<template>
  <section data-test="credit-card-statement-view">
    <PageHeader :title="t('creditCards.statementDetail.title')" :description="statement ? formatIsoDate(statement.closing_date) : ''">
      <template #actions>
        <ElButton :icon="ArrowLeft" data-test="credit-card-statement-back" @click="goBack">{{ t('creditCards.detail.back') }}</ElButton>
      </template>
    </PageHeader>

    <ElAlert v-if="store.error" type="error" :closable="false" :title="store.error.message" data-test="credit-card-statement-error" />
    <ElSkeleton v-if="store.loading && !statement" :rows="4" animated />

    <template v-else-if="statement">
      <p class="statement__status">
        <ElTag :type="statementStatus(statement.status).tone" data-test="credit-card-statement-status">
          {{ t(statementStatus(statement.status).labelKey) }}
        </ElTag>
        <span class="statement__muted">
          {{ formatIsoDate(statement.period_from) }} – {{ formatIsoDate(statement.period_to) }} ·
          {{ t('creditCards.statement.due') }} {{ formatIsoDate(statement.due_date) }}
        </span>
      </p>

      <dl class="statement__totals" data-test="credit-card-statement-totals">
        <div>
          <dt>{{ t('creditCards.statement.original') }}</dt>
          <dd>{{ formatBRL(statement.original_amount.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.statement.creditAdjustments') }}</dt>
          <dd>{{ formatBRL(statement.credit_adjustments.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.statement.net') }}</dt>
          <dd>{{ formatBRL(statement.net_amount.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.statement.paid') }}</dt>
          <dd>{{ formatBRL(statement.paid_amount.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.statement.outstanding') }}</dt>
          <dd data-test="credit-card-statement-outstanding">{{ formatBRL(statement.outstanding_amount.amount_centavos) }}</dd>
        </div>
      </dl>

      <section class="statement__block" data-test="credit-card-statement-lines">
        <h2>{{ t('creditCards.statementDetail.lines') }}</h2>
        <ElEmpty v-if="statement.installments.length === 0" :description="t('creditCards.statementsEmpty')" />
        <ul v-else class="statement__list">
          <li v-for="installment in statement.installments" :key="installment.id" :data-test="`credit-card-line-${installment.id}`">
            <span>{{ installmentLabel(installment.sequence, installment.total_count) }}</span>
            <span class="statement__muted">{{ installment.statement?.card?.name }}</span>
            <span>{{ formatBRL(installment.amount.amount_centavos) }}</span>
          </li>
        </ul>
      </section>

      <section class="statement__block" data-test="credit-card-statement-payments">
        <h2>{{ t('creditCards.statementDetail.payments') }}</h2>
        <ElEmpty v-if="statement.payments.length === 0" :description="t('creditCards.statementDetail.paymentsEmpty')" />
        <ul v-else class="statement__list">
          <li v-for="payment in statement.payments" :key="payment.id" :data-test="`credit-card-payment-${payment.id}`">
            <span>{{ formatIsoDate(payment.payment_date) }}</span>
            <span class="statement__muted">{{ payment.financial_account.name }}</span>
            <ElTag :type="paymentStatus(payment.status).tone" size="small">{{ t(paymentStatus(payment.status).labelKey) }}</ElTag>
            <span>{{ formatBRL(payment.amount.amount_centavos) }}</span>
          </li>
        </ul>
      </section>

      <section class="statement__block" data-test="credit-card-statement-credit-events">
        <h2>{{ t('creditCards.statementDetail.creditEvents') }}</h2>
        <ElEmpty v-if="statement.credit_events.length === 0" :description="t('creditCards.statementDetail.creditEventsEmpty')" />
        <ul v-else class="statement__list">
          <li v-for="event in statement.credit_events" :key="event.id" :data-test="`credit-card-credit-event-${event.id}`">
            <span>{{ t(`creditCards.creditEventReason.${event.reason}`) }}</span>
            <span class="statement__muted">{{ formatIsoDate(event.event_date) }}</span>
            <span>{{ formatBRL(event.amount.amount_centavos) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<style scoped>
.statement__status,
.statement__block h2 {
  margin: 0 0 0.5rem;
}

.statement__status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.statement__totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem;
  margin: 0 0 1rem;
}

.statement__totals dt {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.statement__totals dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.statement__list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.statement__list li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5rem;
}

.statement__muted {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}
</style>
