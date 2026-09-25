<script setup>
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElIcon, ElTag, ElButton } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { CATEGORY_ICON_COMPONENTS, categoryColorStyle } from '@/utils/categories/categoryOptions'
import {
  cardIdentityLabel,
  formatBRL,
  formatIsoDate,
  formatStatementMonth,
  installmentLabel,
  recognitionStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  installment: { type: Object, required: true },
  card: { type: Object, default: null },
  statement: { type: Object, default: null },
  expanded: { type: Boolean, default: false },
  actionLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle', 'correct', 'refund', 'navigate-source'])
const { t, locale } = useI18n()
const headerId = computed(() => `statement-line-header-${props.installment.id}`)
const detailsId = computed(() => `statement-line-details-${props.installment.id}`)
const categoryIcon = computed(() => CATEGORY_ICON_COMPONENTS[props.installment.category?.icon] ?? null)
const status = computed(() => props.installment.recognition_status
  ? recognitionStatus(props.installment.recognition_status)
  : null)
const cardLabel = computed(() => cardIdentityLabel(props.card) || props.card?.name || '')
const statementMonth = computed(() => formatStatementMonth(props.statement?.closing_date, locale.value))
const hasAdjustment = computed(() => Number(props.installment.credit_adjustment?.amount_centavos ?? 0) !== 0)
const canAct = computed(() => props.installment.purchase_id != null)
</script>

<template>
  <li
    class="transaction-item"
    :class="{ 'is-expanded': props.expanded }"
    :data-test="`credit-card-line-${props.installment.id}`"
  >
    <button
      :id="headerId"
      type="button"
      class="transaction-header"
      :aria-expanded="props.expanded"
      :aria-controls="detailsId"
      :data-test="`credit-card-line-toggle-${props.installment.id}`"
      @click="emit('toggle', props.installment.id)"
    >
      <span
        v-if="categoryIcon"
        class="category-icon"
        :style="categoryColorStyle(props.installment.category?.color)"
        aria-hidden="true"
      >
        <ElIcon :size="17"><component :is="categoryIcon" /></ElIcon>
      </span>
      <span class="transaction-copy">
        <strong class="transaction-description">{{ props.installment.description }}</strong>
        <span class="transaction-meta">
          <span v-if="props.installment.purchase_date">{{ formatIsoDate(props.installment.purchase_date) }}</span>
          <span v-if="props.installment.category?.name" class="meta-category">{{ props.installment.category.name }}</span>
          <span v-if="props.installment.sequence != null && props.installment.total_count != null" class="meta-installment">
            {{ installmentLabel(props.installment.sequence, props.installment.total_count) }}
          </span>
        </span>
      </span>
      <span class="transaction-right">
        <strong v-if="props.installment.amount?.amount_centavos != null" class="transaction-amount">
          {{ formatBRL(props.installment.amount.amount_centavos) }}
        </strong>
        <ElTag v-if="status" size="small" :type="status.tone" class="transaction-status">
          {{ t(status.labelKey) }}
        </ElTag>
      </span>
      <ElIcon class="transaction-chevron" :class="{ 'is-rotated': props.expanded }" aria-hidden="true">
        <ArrowDown />
      </ElIcon>
    </button>

    <div
      v-show="props.expanded"
      :id="detailsId"
      class="transaction-details"
      role="region"
      :aria-labelledby="headerId"
      :data-test="`credit-card-line-details-${props.installment.id}`"
    >
      <h3>{{ t('creditCards.statementDetail.transactionDetails') }}</h3>
      <dl class="detail-grid">
        <div v-if="props.installment.description" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.description') }}</dt>
          <dd>{{ props.installment.description }}</dd>
        </div>
        <div v-if="props.installment.purchase_date" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.purchaseDate') }}</dt>
          <dd>{{ formatIsoDate(props.installment.purchase_date) }}</dd>
        </div>
        <div v-if="props.installment.category?.name" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.category') }}</dt>
          <dd>{{ props.installment.category.name }}</dd>
        </div>
        <div v-if="props.installment.recurrence_source" class="detail-pair">
          <dt>{{ t('creditCards.purchase.recurrenceSource') }}</dt>
          <dd>
            <button
              type="button"
              class="cursor-pointer border-0 bg-transparent p-0 text-left text-[var(--color-action-primary)]"
              :data-test="`credit-card-line-source-${props.installment.id}`"
              @click.stop="emit('navigate-source', props.installment)"
            >
              {{ formatIsoDate(props.installment.recurrence_source.scheduled_date) }}
            </button>
          </dd>
        </div>
        <div v-if="cardLabel" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.creditCard') }}</dt>
          <dd>{{ cardLabel }}</dd>
        </div>
        <div v-if="statementMonth" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.statement') }}</dt>
          <dd>{{ statementMonth }}</dd>
        </div>
        <div v-if="props.statement?.period_from && props.statement?.period_to" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.billingPeriod') }}</dt>
          <dd>{{ formatIsoDate(props.statement.period_from) }} – {{ formatIsoDate(props.statement.period_to) }}</dd>
        </div>
        <div v-if="props.installment.sequence != null && props.installment.total_count != null" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.installment') }}</dt>
          <dd>{{ installmentLabel(props.installment.sequence, props.installment.total_count) }}</dd>
        </div>
        <div v-if="props.installment.purchase_total_amount?.amount_centavos != null" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.purchaseTotal') }}</dt>
          <dd class="money-value">{{ formatBRL(props.installment.purchase_total_amount.amount_centavos) }}</dd>
        </div>
        <div v-if="props.installment.amount?.amount_centavos != null" class="detail-pair">
          <dt>{{ t('creditCards.statementDetail.amount') }}</dt>
          <dd class="money-value">{{ formatBRL(props.installment.amount.amount_centavos) }}</dd>
        </div>
        <template v-if="hasAdjustment">
          <div class="detail-pair">
            <dt>{{ t('creditCards.statementDetail.creditAdjustment') }}</dt>
            <dd class="money-value">{{ formatBRL(props.installment.credit_adjustment.amount_centavos) }}</dd>
          </div>
          <div v-if="props.installment.recognized_amount?.amount_centavos != null" class="detail-pair">
            <dt>{{ t('creditCards.statementDetail.recognizedAmount') }}</dt>
            <dd class="money-value">{{ formatBRL(props.installment.recognized_amount.amount_centavos) }}</dd>
          </div>
        </template>
        <div v-if="status" class="detail-pair">
          <dt>{{ t('creditCards.purchase.status') }}</dt>
          <dd>{{ t(status.labelKey) }}</dd>
        </div>
      </dl>
      <div v-if="canAct" class="detail-actions">
        <ElButton
          v-if="props.installment.is_directly_editable"
          size="small"
          :disabled="props.actionLoading"
          :data-test="`credit-card-line-correct-${props.installment.id}`"
          @click.stop="emit('correct', props.installment)"
        >{{ t('creditCards.correction.action') }}</ElButton>
        <ElButton
          size="small"
          :disabled="props.actionLoading"
          :data-test="`credit-card-line-refund-${props.installment.id}`"
          @click.stop="emit('refund', props.installment)"
        >{{ t('creditCards.creditEvent.action') }}</ElButton>
      </div>
    </div>
  </li>
</template>

<style scoped>
.transaction-item {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  overflow: hidden;
}

.transaction-item.is-expanded {
  border-color: var(--color-border-strong);
}

.transaction-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, auto) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  min-height: 56px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.transaction-header:hover,
.transaction-item.is-expanded .transaction-header {
  background: var(--color-surface-secondary);
}

.transaction-header:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}

.category-icon {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-text);
}

.transaction-copy,
.transaction-right {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.transaction-description {
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.transaction-meta {
  display: flex;
  gap: 4px 8px;
  flex-wrap: wrap;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}

.transaction-right {
  justify-items: end;
  text-align: right;
}

.transaction-amount {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.transaction-chevron {
  color: var(--color-text-muted);
  transition: transform 160ms ease;
}

.transaction-chevron.is-rotated {
  transform: rotate(180deg);
}

.transaction-details {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-secondary);
}

.transaction-details h3 {
  margin: 0 0 12px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 24px;
  margin: 0;
}

.detail-pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 12px;
  font-size: 13px;
  line-height: 20px;
}

.detail-pair dt {
  color: var(--color-text-muted);
}

.detail-pair dd {
  min-width: 0;
  margin: 0;
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.money-value {
  font-variant-numeric: tabular-nums;
}

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 639px) {
  .transaction-header {
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 42%) auto;
    gap: 8px;
  }

  .transaction-meta {
    grid-column: 1 / -1;
  }

  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-pair {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
}

@media (max-width: 359px) {
  .transaction-header {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .transaction-right {
    grid-column: 2 / -1;
    grid-row: 2;
    justify-items: start;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .transaction-chevron {
    transition: none;
  }
}
</style>
