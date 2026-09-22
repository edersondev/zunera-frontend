<script setup>
import { ArrowRight } from '@element-plus/icons-vue'
import { ElEmpty, ElIcon, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  formatBRL,
  formatIsoDate,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  statements: { type: Array, default: () => [] },
  locale: { type: String, default: 'pt-BR' },
})

const emit = defineEmits(['open'])
const { t } = useI18n()
</script>

<template>
  <section class="statement-history" data-test="credit-card-statements" aria-labelledby="statement-history-title">
    <h2 id="statement-history-title">{{ t('creditCards.detail.statements') }}</h2>
    <ElEmpty v-if="props.statements.length === 0" :description="t('creditCards.statementsEmpty')" />
    <ul v-else class="statement-list">
      <li v-for="statement in props.statements" :key="statement.id">
        <button
          type="button"
          class="statement-row"
          :data-test="`credit-card-statement-${statement.id}`"
          @click="emit('open', statement)"
        >
          <span class="statement-date">
            {{ formatIsoDate(statement.period_from, props.locale) }} –
            {{ formatIsoDate(statement.period_to, props.locale) }}
          </span>
          <ElTag :type="statementStatus(statement.status).tone" size="small">
            {{ t(statementStatus(statement.status).labelKey) }}
          </ElTag>
          <span class="statement-amount">{{ formatBRL(statement.outstanding_amount.amount_centavos, props.locale) }}</span>
          <ElIcon class="statement-arrow" aria-hidden="true"><ArrowRight /></ElIcon>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.statement-history {
  display: grid;
  gap: 12px;
}

.statement-history h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.statement-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.statement-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px 12px;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.statement-date,
.statement-amount {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.statement-date {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.statement-amount {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 20px;
  text-align: right;
}

.statement-arrow {
  color: var(--color-text-muted);
}

.statement-row:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-secondary);
}

.statement-row:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}

@media (max-width: 639px) {
  .statement-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .statement-amount {
    grid-column: 1;
    text-align: left;
  }

  .statement-arrow {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
}
</style>
