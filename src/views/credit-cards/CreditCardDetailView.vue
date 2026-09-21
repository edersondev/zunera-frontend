<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import CreditCardPurchaseForm from '@/components/credit-cards/CreditCardPurchaseForm.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import {
  availableCreditPresentation,
  billingCycleSummary,
  cardIdentityLabel,
  formatBRL,
  formatIsoDate,
  installmentLabel,
  recognitionStatus,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({ cardId: { type: [String, Number], required: true } })
const store = useCreditCardStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const card = computed(() => store.card)
const currentStatement = computed(() => card.value?.current_statement ?? null)
const purchaseDialogVisible = shallowRef(false)
const createdPurchase = shallowRef(null)
const successMessage = shallowRef('')
const availablePresentation = computed(() =>
  availableCreditPresentation(card.value?.summary?.available_credit?.amount_centavos ?? 0),
)

onMounted(async () => {
  const id = Number(props.cardId ?? route.params.card_id)
  await store.fetchCard(id)
  await Promise.allSettled([store.fetchStatements(id), store.fetchPurchases(id)])
})

function goBack() {
  router.push({ name: 'credit-cards' })
}

function openPurchaseDialog() {
  successMessage.value = ''
  createdPurchase.value = null
  store.dismissOverLimit()
  purchaseDialogVisible.value = true
}

async function submitPurchase(payload) {
  const outcome = await store.submitPurchase(Number(props.cardId ?? route.params.card_id), payload)
  if (outcome.ok) {
    createdPurchase.value = outcome.purchase
    successMessage.value = t('creditCards.purchase.created')
    await store.fetchPurchases(Number(props.cardId ?? route.params.card_id))
  }
}

async function confirmOverLimit() {
  const outcome = await store.submitOverLimit()
  if (outcome.ok) {
    createdPurchase.value = outcome.purchase
    successMessage.value = t('creditCards.purchase.created')
    await store.fetchPurchases(Number(props.cardId ?? route.params.card_id))
  }
}

function openStatement(statement) {
  if (statement.id === null) return

  router.push({ name: 'credit-card-statement-detail', params: { statement_id: statement.id } })
}
</script>

<template>
  <section class="credit-card-detail" data-test="credit-card-detail-view">
    <PageHeader :title="card?.name ?? t('creditCards.detail.title')" :description="cardIdentityLabel(card ?? {})">
      <template #actions>
        <ElButton :icon="ArrowLeft" data-test="credit-card-detail-back" @click="goBack">
          {{ t('creditCards.detail.back') }}
        </ElButton>
        <ElButton type="primary" :icon="Plus" data-test="credit-card-purchase-create" @click="openPurchaseDialog">
          {{ t('creditCards.purchase.title') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert v-if="store.error" type="error" :closable="false" :title="store.error.message" data-test="credit-card-detail-error" />
    <ElAlert v-if="successMessage" type="success" :closable="false" :title="successMessage" data-test="credit-card-purchase-success" />
    <ElSkeleton v-if="store.loading && !card" :rows="4" animated data-test="credit-card-detail-loading" />

    <template v-else-if="card">
      <dl class="credit-card-detail__summary" data-test="credit-card-detail-summary">
        <div>
          <dt>{{ t('creditCards.summary.limit') }}</dt>
          <dd>{{ formatBRL(card.summary.credit_limit.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.summary.used') }}</dt>
          <dd>{{ formatBRL(card.summary.used_credit.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.summary.cardCredit') }}</dt>
          <dd data-test="credit-card-detail-card-credit">{{ formatBRL(card.summary.card_credit.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.summary.available') }}</dt>
          <dd data-test="credit-card-detail-available">{{ formatBRL(card.summary.available_credit.amount_centavos) }}</dd>
        </div>
        <div>
          <dt>{{ t('creditCards.summary.billingDays') }}</dt>
          <dd>{{ billingCycleSummary(card).label }}</dd>
        </div>
      </dl>

      <p v-if="availablePresentation.isOverLimit" class="credit-card-detail__over-limit" data-test="credit-card-detail-over-limit">
        {{ t('creditCards.overLimit', { amount: availablePresentation.formatted }) }}
      </p>

      <section class="credit-card-detail__block" data-test="credit-card-current-statement">
        <h2>{{ t('creditCards.detail.currentStatement') }}</h2>
        <template v-if="currentStatement">
          <p>
            <ElTag :type="statementStatus(currentStatement.status).tone">
              {{ t(statementStatus(currentStatement.status).labelKey) }}
            </ElTag>
            <span class="credit-card-detail__muted">
              {{ formatIsoDate(currentStatement.period_from) }} – {{ formatIsoDate(currentStatement.period_to) }}
            </span>
          </p>
          <dl class="credit-card-detail__summary">
            <div>
              <dt>{{ t('creditCards.statement.outstanding') }}</dt>
              <dd data-test="credit-card-current-outstanding">
                {{ formatBRL(currentStatement.outstanding_amount.amount_centavos) }}
              </dd>
            </div>
            <div>
              <dt>{{ t('creditCards.statement.closing') }}</dt>
              <dd>{{ formatIsoDate(currentStatement.closing_date) }}</dd>
            </div>
            <div>
              <dt>{{ t('creditCards.statement.due') }}</dt>
              <dd>{{ formatIsoDate(currentStatement.due_date) }}</dd>
            </div>
          </dl>
        </template>
      </section>

      <section class="credit-card-detail__block" data-test="credit-card-statements">
        <h2>{{ t('creditCards.detail.statements') }}</h2>
        <ElEmpty v-if="store.statements.length === 0" :description="t('creditCards.statementsEmpty')" />
        <ul v-else class="credit-card-detail__list">
          <li v-for="statement in store.statements" :key="statement.id">
            <button type="button" class="credit-card-detail__statement" :data-test="`credit-card-statement-${statement.id}`" @click="openStatement(statement)">
              <span>{{ formatIsoDate(statement.closing_date) }}</span>
              <ElTag :type="statementStatus(statement.status).tone" size="small">
                {{ t(statementStatus(statement.status).labelKey) }}
              </ElTag>
              <span class="credit-card-detail__muted">{{ formatBRL(statement.outstanding_amount.amount_centavos) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section class="credit-card-detail__block" data-test="credit-card-purchases">
        <h2>{{ t('creditCards.detail.purchases') }}</h2>
        <ElEmpty v-if="store.purchases.length === 0" :description="t('creditCards.purchasesEmpty')" />
        <ul v-else class="credit-card-detail__list">
          <li v-for="purchase in store.purchases" :key="purchase.id" :data-test="`credit-card-purchase-${purchase.id}`">
            <div class="credit-card-detail__purchase">
              <span>{{ purchase.description }}</span>
              <span class="credit-card-detail__muted">
                {{ formatBRL(purchase.total_amount.amount_centavos) }} ·
                {{ installmentLabel(purchase.installments[0]?.sequence, purchase.installment_count) }} ·
                {{ formatIsoDate(purchase.purchase_date) }}
              </span>
              <ElTag
                v-if="purchase.installments[0]"
                :type="recognitionStatus(purchase.installments[0].recognition_status).tone"
                size="small"
              >
                {{ t(recognitionStatus(purchase.installments[0].recognition_status).labelKey) }}
              </ElTag>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <CreditCardPurchaseForm
      v-model:visible="purchaseDialogVisible"
      :card="card"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      :over-limit="store.pendingOverLimit"
      :created-purchase="createdPurchase"
      @submit="submitPurchase"
      @confirm-over-limit="confirmOverLimit"
      @dismiss-over-limit="store.dismissOverLimit()"
    />
  </section>
</template>

<style scoped>
.credit-card-detail {
  display: grid;
  gap: 1.25rem;
}

.credit-card-detail__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.credit-card-detail__summary dt {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.credit-card-detail__summary dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.credit-card-detail__block h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.credit-card-detail__list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.credit-card-detail__statement,
.credit-card-detail__purchase {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  inline-size: 100%;
  padding: 0.5rem 0.75rem;
  text-align: start;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5rem;
}

.credit-card-detail__statement {
  background: none;
  cursor: pointer;
}

.credit-card-detail__muted {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}

.credit-card-detail__over-limit {
  margin: 0;
  font-weight: 600;
  color: var(--el-color-danger);
}
</style>
