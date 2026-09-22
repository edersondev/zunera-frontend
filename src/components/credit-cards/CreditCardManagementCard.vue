<script setup>
import { computed } from 'vue'
import { ArrowRight, Edit, FolderDelete } from '@element-plus/icons-vue'
import { ElButton, ElIcon, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import CreditCardUtilizationProgress from '@/components/dashboard/CreditCardUtilizationProgress.vue'
import {
  CREDIT_CARD_ICON_COMPONENTS,
  creditCardColorLabel,
  creditCardColorStyle,
  creditCardIconLabel,
} from '@/utils/credit-cards/creditCardAppearance'
import {
  availableCreditPresentation,
  cardIdentityLabel,
  formatBRL,
  formatIsoDate,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  card: { type: Object, required: true },
  locale: { type: String, default: 'pt-BR' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'edit', 'archive'])
const { t } = useI18n()
const summary = computed(() => props.card.summary ?? {})
const statement = computed(() => props.card.current_statement ?? null)
const usedCentavos = computed(() => summary.value.used_credit?.amount_centavos ?? 0)
const limitCentavos = computed(() => summary.value.credit_limit?.amount_centavos ?? 0)
const cardCreditCentavos = computed(() => summary.value.card_credit?.amount_centavos ?? 0)
const availableCentavos = computed(() => summary.value.available_credit?.amount_centavos ?? 0)
const outstandingCentavos = computed(() => statement.value?.outstanding_amount?.amount_centavos ?? 0)
const available = computed(() => availableCreditPresentation(availableCentavos.value, props.locale))
const status = computed(() => statementStatus(statement.value?.status))
const identity = computed(() => cardIdentityLabel(props.card))
const appearanceColor = computed(() => props.card.color ?? 'violet')
const appearanceIcon = computed(() => props.card.icon ?? 'credit_card')
const appearanceLabel = computed(() =>
  `${creditCardColorLabel(appearanceColor.value, t)}, ${creditCardIconLabel(appearanceIcon.value, t)}`,
)

</script>

<template>
  <article class="management-card" :data-test="`credit-card-${props.card.id}`">
    <header class="management-card-header">
      <div class="card-heading">
        <span
          class="card-appearance"
          :style="creditCardColorStyle(appearanceColor)"
          :aria-label="appearanceLabel"
          role="img"
          data-test="credit-card-appearance"
        >
          <ElIcon :size="18" aria-hidden="true">
            <component :is="CREDIT_CARD_ICON_COMPONENTS[appearanceIcon]" />
          </ElIcon>
        </span>
        <div class="card-identity">
          <h2>{{ props.card.name }}</h2>
          <p v-if="identity">{{ identity }}</p>
        </div>
      </div>
      <ElTag v-if="props.card.summary?.is_over_limit" type="danger" size="small">
        {{ t('creditCards.summary.overLimitTag') }}
      </ElTag>
    </header>

    <section class="available-credit" :data-test="`credit-card-available-${props.card.id}`">
      <p>{{ t('creditCards.summary.available') }}</p>
      <strong>{{ formatBRL(availableCentavos, props.locale) }}</strong>
    </section>

    <CreditCardUtilizationProgress
      :used-centavos="usedCentavos"
      :limit-centavos="limitCentavos"
      :available-centavos="availableCentavos"
      :locale="props.locale"
      :label="t('creditCards.detail.utilization')"
      :is-over-limit="available.isOverLimit"
    />

    <dl class="supporting-balances">
      <div>
        <dt>{{ t('creditCards.summary.limit') }}</dt>
        <dd>{{ formatBRL(limitCentavos, props.locale) }}</dd>
      </div>
      <div>
        <dt>{{ t('creditCards.summary.used') }}</dt>
        <dd>{{ formatBRL(usedCentavos, props.locale) }}</dd>
      </div>
      <div>
        <dt>{{ t('creditCards.summary.cardCredit') }}</dt>
        <dd>{{ formatBRL(cardCreditCentavos, props.locale) }}</dd>
      </div>
    </dl>

    <section class="current-statement" :data-test="`credit-card-current-statement-${props.card.id}`">
      <div class="statement-heading">
        <p>{{ t('creditCards.detail.currentStatement') }}</p>
        <ElTag v-if="statement" :type="status.tone" size="small" data-test="credit-card-current-status">
          {{ t(status.labelKey) }}
        </ElTag>
      </div>
      <strong data-test="credit-card-current-outstanding">
        {{ formatBRL(outstandingCentavos, props.locale) }}
      </strong>
      <p v-if="statement?.due_date" class="statement-due">
        {{ t('creditCards.management.dueOn', { date: formatIsoDate(statement.due_date, props.locale) }) }}
      </p>
      <p v-else class="statement-due">{{ t('creditCards.management.noCurrentStatement') }}</p>
    </section>

    <footer class="card-actions">
      <ElButton
        type="primary"
        plain
        :icon="ArrowRight"
        :disabled="props.loading"
        :aria-label="t('creditCards.management.viewDetailsFor', { name: props.card.name })"
        :data-test="`credit-card-open-${props.card.id}`"
        @click="emit('open', props.card)"
      >
        {{ t('creditCards.management.viewDetails') }}
      </ElButton>
      <ElButton
        type="info"
        :icon="Edit"
        :disabled="props.loading"
        data-test="credit-card-edit"
        @click="emit('edit', props.card)"
      >
        {{ t('common.edit') }}
      </ElButton>
      <ElButton
        type="warning"
        :icon="FolderDelete"
        :disabled="props.loading"
        data-test="credit-card-archive"
        @click="emit('archive', props.card)"
      >
        {{ t('creditCards.archive') }}
      </ElButton>
    </footer>
  </article>
</template>

<style scoped>
.management-card {
  display: grid;
  gap: 20px;
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.management-card-header,
.statement-heading,
.card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.card-appearance {
  display: grid;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--color-surface);
}

.card-identity,
.available-credit,
.current-statement,
.supporting-balances > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.card-identity h2,
.card-identity p,
.available-credit p,
.available-credit strong,
.current-statement p,
.current-statement strong,
.supporting-balances dt,
.supporting-balances dd {
  margin: 0;
}

.card-identity h2 {
  overflow: hidden;
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-identity p,
.available-credit p,
.statement-heading p,
.statement-due,
.supporting-balances dt {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.available-credit strong {
  overflow: hidden;
  color: var(--color-text);
  font-size: 30px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 36px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.supporting-balances {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.supporting-balances dd {
  overflow: hidden;
  color: var(--color-text);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-statement {
  gap: 8px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
}

.current-statement strong {
  color: var(--color-text);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 28px;
}

.card-actions {
  justify-content: flex-start;
}

@media (max-width: 479px) {
  .management-card {
    padding: 16px;
  }

  .supporting-balances {
    grid-template-columns: 1fr;
  }
}
</style>
