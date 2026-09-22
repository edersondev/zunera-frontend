<script setup>
import { ElEmpty } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  formatBRL,
  formatIsoDate,
  installmentLabel,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  installments: { type: Array, default: () => [] },
  statementAmountCentavos: { type: Number, default: 0 },
})

const { t } = useI18n()
</script>

<template>
  <section class="statement-line-items" data-test="credit-card-statement-lines" aria-labelledby="statement-line-items-title">
    <header class="section-header">
      <div>
        <h2 id="statement-line-items-title">{{ t('creditCards.statementDetail.lines') }}</h2>
        <p v-if="props.installments.length > 0">
          {{
            t('creditCards.statementDetail.lineItemsSummary', {
              count: props.installments.length,
              amount: formatBRL(props.statementAmountCentavos),
            })
          }}
        </p>
      </div>
    </header>

    <ElEmpty
      v-if="props.installments.length === 0"
      :image-size="48"
      :description="t('creditCards.statementsEmpty')"
    />
    <template v-else>
      <div class="line-columns" aria-hidden="true">
        <span>{{ t('creditCards.statementDetail.description') }}</span>
        <span>{{ t('creditCards.statementDetail.purchaseDate') }}</span>
        <span>{{ t('creditCards.statementDetail.installment') }}</span>
        <span>{{ t('creditCards.statementDetail.amount') }}</span>
      </div>
      <ul class="line-list">
        <li
          v-for="installment in props.installments"
          :key="installment.id"
          class="line-row"
          :data-test="`credit-card-line-${installment.id}`"
        >
          <div class="line-description">
            <strong>{{ installment.description }}</strong>
          </div>
          <div class="line-meta">
            <span class="line-date">{{ formatIsoDate(installment.purchase_date) }}</span>
            <span class="line-installment">
              {{ installmentLabel(installment.sequence, installment.total_count) }}
            </span>
          </div>
          <strong class="line-amount">{{ formatBRL(installment.amount?.amount_centavos) }}</strong>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.statement-line-items {
  display: grid;
  gap: 12px;
}

.section-header h2,
.section-header p {
  margin: 0;
}

.section-header h2 {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.section-header p {
  margin-top: 4px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.line-columns,
.line-row {
  display: grid;
  grid-template-columns: minmax(13rem, 2fr) minmax(8rem, 1fr) minmax(6rem, 0.7fr) minmax(7rem, 0.8fr);
  gap: 12px;
  align-items: center;
}

.line-columns {
  padding: 0 16px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.line-columns span:last-child {
  text-align: right;
}

.line-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.line-row {
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.line-description {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.line-description strong,
.line-amount {
  overflow: hidden;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-description strong {
  font-size: 14px;
  line-height: 20px;
}

.line-date,
.line-installment {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.line-amount {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 20px;
  text-align: right;
}

.line-meta {
  display: contents;
}

@media (max-width: 767px) {
  .line-columns {
    display: none;
  }

  .line-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'description amount'
      'meta meta';
    gap: 8px 12px;
  }

  .line-description {
    grid-area: description;
  }

  .line-amount {
    grid-area: amount;
  }

  .line-meta {
    grid-area: meta;
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .line-date::after {
    content: '·';
  }
}
</style>
