<script setup>
import { shallowRef, watch } from 'vue'
import { ElEmpty } from 'element-plus'
import { useI18n } from 'vue-i18n'
import ExpandableTransactionItem from '@/components/credit-cards/ExpandableTransactionItem.vue'
import { formatBRL } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  installments: { type: Array, default: () => [] },
  statementAmountCentavos: { type: Number, default: 0 },
  card: { type: Object, default: null },
  statement: { type: Object, default: null },
  actionLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['correct', 'refund'])
const { t } = useI18n()
const expandedId = shallowRef(null)

watch(
  () => props.installments.map((installment) => installment.id),
  (ids) => {
    if (expandedId.value !== null && !ids.includes(expandedId.value)) expandedId.value = null
  },
)

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}
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
    <ul v-else class="line-list">
      <ExpandableTransactionItem
        v-for="installment in props.installments"
        :key="installment.id"
        :installment="installment"
        :card="props.card"
        :statement="props.statement"
        :expanded="expandedId === installment.id"
        :action-loading="props.actionLoading"
        @toggle="toggle"
        @correct="emit('correct', $event)"
        @refund="emit('refund', $event)"
      />
    </ul>
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

.line-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
