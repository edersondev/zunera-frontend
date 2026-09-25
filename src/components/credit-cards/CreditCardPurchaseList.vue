<script setup>
import { Edit, MoreFilled, RefreshLeft } from '@element-plus/icons-vue'
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElIcon,
  ElTag,
} from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  formatBRL,
  formatIsoDate,
  installmentLabel,
  recognitionStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  purchases: { type: Array, default: () => [] },
  locale: { type: String, default: 'pt-BR' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['correct', 'refund', 'navigate-source'])
const { t } = useI18n()

function handleCommand(purchase, command) {
  if (props.loading) return

  if (command === 'correct') emit('correct', purchase)
  if (command === 'refund') emit('refund', purchase)
}
</script>

<template>
  <section class="purchase-history" data-test="credit-card-purchases" aria-labelledby="purchase-history-title">
    <h2 id="purchase-history-title">{{ t('creditCards.detail.purchases') }}</h2>
    <ElEmpty v-if="props.purchases.length === 0" :description="t('creditCards.purchasesEmpty')" />
    <template v-else>
      <div class="purchase-columns" aria-hidden="true">
        <span>{{ t('creditCards.purchase.description') }}</span>
        <span>{{ t('creditCards.purchase.date') }}</span>
        <span>{{ t('creditCards.purchase.installments') }}</span>
        <span>{{ t('creditCards.purchase.amount') }}</span>
        <span>{{ t('creditCards.purchase.status') }}</span>
        <span>{{ t('creditCards.purchase.actions') }}</span>
      </div>
      <ul class="purchase-list">
        <li
          v-for="purchase in props.purchases"
          :key="purchase.id"
          class="purchase-row"
          :data-test="`credit-card-purchase-${purchase.id}`"
        >
          <span class="purchase-description">
            {{ purchase.description }}
            <button
              v-if="purchase.recurrence_source"
              type="button"
              class="purchase-source"
              :data-test="`credit-card-purchase-source-${purchase.id}`"
              @click.stop="emit('navigate-source', purchase)"
            >
              {{ t('creditCards.purchase.recurrenceSource') }} · {{ formatIsoDate(purchase.recurrence_source.scheduled_date, props.locale) }}
            </button>
          </span>
          <span class="purchase-meta">
            <span class="purchase-date">{{ formatIsoDate(purchase.purchase_date, props.locale) }}</span>
            <span class="purchase-installments">{{ installmentLabel(purchase.installments[0]?.sequence, purchase.installment_count) }}</span>
          </span>
          <span class="purchase-amount">{{ formatBRL(purchase.total_amount.amount_centavos, props.locale) }}</span>
          <ElTag
            v-if="purchase.installments[0]"
            class="purchase-status"
            :type="recognitionStatus(purchase.installments[0].recognition_status).tone"
            size="small"
          >
            {{ t(recognitionStatus(purchase.installments[0].recognition_status).labelKey) }}
          </ElTag>
          <span v-else class="purchase-status">—</span>
          <ElDropdown trigger="click" @command="handleCommand(purchase, $event)">
            <ElButton
              circle
              type="info"
              :icon="MoreFilled"
              :disabled="props.loading"
              :aria-label="t('creditCards.purchase.actions')"
              :data-test="`credit-card-purchase-actions-${purchase.id}`"
              @click.stop
            />
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem
                  v-if="purchase.is_directly_editable"
                  command="correct"
                  :disabled="props.loading"
                  :data-test="`credit-card-purchase-correct-${purchase.id}`"
                >
                  <ElIcon><Edit /></ElIcon>
                  <span>{{ t('creditCards.correction.action') }}</span>
                </ElDropdownItem>
                <ElDropdownItem
                  command="refund"
                  :disabled="props.loading"
                  :data-test="`credit-card-purchase-credit-event-${purchase.id}`"
                >
                  <ElIcon><RefreshLeft /></ElIcon>
                  <span>{{ t('creditCards.creditEvent.action') }}</span>
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.purchase-history {
  display: grid;
  gap: 12px;
}

.purchase-history h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.purchase-columns,
.purchase-row {
  display: grid;
  grid-template-columns: minmax(10rem, 2fr) minmax(7rem, 1fr) minmax(5.5rem, 0.7fr) minmax(7rem, 1fr) minmax(6.5rem, 0.8fr) auto;
  gap: 12px;
  align-items: center;
}

.purchase-columns {
  padding: 0 16px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.purchase-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.purchase-meta {
  display: contents;
}

.purchase-row {
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.purchase-description,
.purchase-date,
.purchase-installments,
.purchase-amount,
.purchase-status {
  min-width: 0;
}

.purchase-description,
.purchase-amount {
  overflow: hidden;
  color: var(--color-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.purchase-description {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.purchase-source {
  display: block;
  margin-top: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary, var(--el-color-primary));
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  text-align: left;
}

.purchase-date,
.purchase-installments {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.purchase-amount {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 20px;
  text-align: right;
}

.purchase-row :deep(.el-dropdown-menu__item) {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 1023px) {
  .purchase-columns {
    display: none;
  }

  .purchase-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'description amount'
      'meta actions'
      'status actions';
    gap: 8px 12px;
  }

  .purchase-description {
    grid-area: description;
  }

  .purchase-date {
    grid-area: auto;
  }

  .purchase-amount {
    grid-area: amount;
  }

  .purchase-status {
    grid-area: status;
    justify-self: start;
  }

  .purchase-meta {
    display: flex;
    grid-area: meta;
    gap: 4px;
    align-items: center;
    color: var(--color-text-muted);
  }

  .purchase-meta::before {
    content: '·';
  }

  .purchase-row > :last-child {
    grid-area: actions;
    align-self: center;
    justify-self: end;
  }
}
</style>
