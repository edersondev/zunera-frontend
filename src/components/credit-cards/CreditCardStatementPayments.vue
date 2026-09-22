<script setup>
import { DocumentCopy } from '@element-plus/icons-vue'
import { ElButton, ElIcon, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  formatBRL,
  formatIsoDate,
  paymentStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  payments: { type: Array, default: () => [] },
  removedPayments: { type: Array, default: () => [] },
})

const emit = defineEmits(['edit', 'remove', 'restore'])
const { t } = useI18n()
</script>

<template>
  <section class="statement-payments" data-test="credit-card-statement-payments" aria-labelledby="statement-payments-title">
    <header class="section-header">
      <h2 id="statement-payments-title">{{ t('creditCards.statementDetail.payments') }}</h2>
    </header>

    <div v-if="props.payments.length === 0" class="compact-empty">
      <ElIcon :size="20"><DocumentCopy /></ElIcon>
      <div>
        <p>{{ t('creditCards.statementDetail.paymentsEmpty') }}</p>
        <span>{{ t('creditCards.statementDetail.paymentsHint') }}</span>
      </div>
    </div>
    <ul v-else class="payment-list">
      <li
        v-for="payment in props.payments"
        :key="payment.id"
        class="payment-row"
        :data-test="`credit-card-payment-${payment.id}`"
      >
        <div class="payment-source">
          <strong>{{ payment.financial_account?.name }}</strong>
          <span>{{ formatIsoDate(payment.payment_date) }}</span>
        </div>
        <ElTag :type="paymentStatus(payment.status).tone" size="small">
          {{ t(paymentStatus(payment.status).labelKey) }}
        </ElTag>
        <strong class="payment-amount">{{ formatBRL(payment.amount?.amount_centavos) }}</strong>
        <div class="payment-actions">
          <ElButton
            size="small"
            :data-test="`credit-card-payment-edit-${payment.id}`"
            @click="emit('edit', payment)"
          >
            {{ t('common.edit') }}
          </ElButton>
          <ElButton
            size="small"
            type="danger"
            plain
            :data-test="`credit-card-payment-remove-${payment.id}`"
            @click="emit('remove', payment)"
          >
            {{ t('creditCards.payment.remove') }}
          </ElButton>
        </div>
      </li>
    </ul>

    <template v-if="props.removedPayments.length > 0">
      <h3>{{ t('creditCards.payment.removedSection') }}</h3>
      <ul class="payment-list">
        <li
          v-for="payment in props.removedPayments"
          :key="payment.id"
          class="payment-row removed-payment"
          :data-test="`credit-card-payment-removed-${payment.id}`"
        >
          <div class="payment-source">
            <strong>{{ payment.financial_account?.name }}</strong>
            <span>{{ formatIsoDate(payment.payment_date) }}</span>
          </div>
          <strong class="payment-amount">{{ formatBRL(payment.amount?.amount_centavos) }}</strong>
          <ElButton
            size="small"
            :data-test="`credit-card-payment-restore-${payment.id}`"
            @click="emit('restore', payment)"
          >
            {{ t('creditCards.payment.restore') }}
          </ElButton>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.statement-payments {
  display: grid;
  gap: 12px;
}

.section-header h2,
.statement-payments h3,
.compact-empty p,
.compact-empty span {
  margin: 0;
}

.section-header h2 {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.statement-payments h3 {
  margin-top: 8px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.compact-empty {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-muted);
}

.compact-empty > div {
  display: grid;
  gap: 2px;
}

.compact-empty p {
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.compact-empty span,
.payment-source span {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.payment-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.payment-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(7rem, auto) auto;
  gap: 12px;
  align-items: center;
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.payment-source {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.payment-source strong,
.payment-amount {
  overflow: hidden;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-source strong {
  font-size: 14px;
  line-height: 20px;
}

.payment-amount {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 20px;
  text-align: right;
}

.payment-actions {
  display: flex;
  gap: 8px;
}

.removed-payment {
  grid-template-columns: minmax(0, 1fr) minmax(7rem, auto) auto;
  background: var(--color-surface-secondary);
}

@media (max-width: 639px) {
  .payment-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'source amount'
      'status actions';
  }

  .payment-source {
    grid-area: source;
  }

  .payment-row > :nth-child(2) {
    grid-area: status;
    justify-self: start;
  }

  .payment-amount {
    grid-area: amount;
  }

  .payment-actions {
    grid-area: actions;
    justify-self: end;
  }

  .removed-payment {
    grid-template-areas: 'source amount' 'actions actions';
  }

  .removed-payment > :nth-child(2) {
    grid-area: amount;
  }

  .removed-payment > :last-child {
    grid-area: actions;
    justify-self: start;
  }
}
</style>
