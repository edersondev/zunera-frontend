<script setup>
import { computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import { ElButton, ElEmpty, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  formatBRL,
  formatIsoDate,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  statement: { type: Object, default: null },
  locale: { type: String, default: 'pt-BR' },
})

const emit = defineEmits(['open'])
const { t } = useI18n()
const status = computed(() => statementStatus(props.statement?.status))
const canOpen = computed(() => props.statement?.id !== null && props.statement?.id !== undefined)
const outstandingCentavos = computed(() => props.statement?.outstanding_amount?.amount_centavos ?? 0)
</script>

<template>
  <section class="current-statement" data-test="credit-card-current-statement" aria-labelledby="current-statement-title">
    <template v-if="props.statement">
      <header class="current-statement-header">
        <div>
          <h2 id="current-statement-title">{{ t('creditCards.detail.currentStatement') }}</h2>
          <p class="statement-period">
            {{ formatIsoDate(props.statement.period_from, props.locale) }} –
            {{ formatIsoDate(props.statement.period_to, props.locale) }}
          </p>
        </div>
        <ElTag :type="status.tone">{{ t(status.labelKey) }}</ElTag>
      </header>

      <div class="statement-balance">
        <p>{{ t('creditCards.statement.outstanding') }}</p>
        <strong data-test="credit-card-current-outstanding">
          {{ formatBRL(outstandingCentavos, props.locale) }}
        </strong>
      </div>

      <dl class="statement-dates">
        <div>
          <dt>{{ t('creditCards.statement.closing') }}</dt>
          <dd>{{ formatIsoDate(props.statement.closing_date, props.locale) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.statement.due') }}</dt>
          <dd>{{ formatIsoDate(props.statement.due_date, props.locale) }}</dd>
        </div>
      </dl>

      <ElButton
        v-if="canOpen"
        type="info"
        plain
        :icon="ArrowRight"
        data-test="credit-card-current-statement-open"
        @click="emit('open', props.statement)"
      >
        {{ t('creditCards.detail.viewStatement') }}
      </ElButton>
    </template>
    <ElEmpty v-else :description="t('creditCards.statementsEmpty')" />
  </section>
</template>

<style scoped>
.current-statement {
  display: grid;
  gap: 20px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.current-statement-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.current-statement-header h2,
.statement-period,
.statement-balance p,
.statement-balance strong,
.statement-dates dt,
.statement-dates dd {
  margin: 0;
}

.current-statement-header h2 {
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.statement-period,
.statement-balance p,
.statement-dates dt {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.statement-period {
  margin-top: 4px;
}

.statement-balance {
  display: grid;
  gap: 4px;
}

.statement-balance strong {
  color: var(--color-text);
  font-size: 30px;
  font-variant-numeric: tabular-nums;
  line-height: 36px;
}

.statement-dates {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.statement-dates > div {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
}

.statement-dates dd {
  color: var(--color-text);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 20px;
}
</style>
