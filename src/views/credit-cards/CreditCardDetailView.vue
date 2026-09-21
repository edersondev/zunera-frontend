<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import CreditCardPurchaseForm from '@/components/credit-cards/CreditCardPurchaseForm.vue'
import CreditCardCorrectionDialog from '@/components/credit-cards/CreditCardCorrectionDialog.vue'
import CreditCardCreditEventDialog from '@/components/credit-cards/CreditCardCreditEventDialog.vue'
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
const correctionTarget = shallowRef(null)
const creditEventTarget = shallowRef(null)
const correctionVisible = shallowRef(false)
const creditEventVisible = shallowRef(false)
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

function openCorrection(purchase) {
  successMessage.value = ''
  correctionTarget.value = purchase
  correctionVisible.value = true
}

function openCreditEvent(purchase) {
  successMessage.value = ''
  creditEventTarget.value = purchase
  creditEventVisible.value = true
}

async function submitCorrection(payload) {
  if (!correctionTarget.value) return

  const outcome = await store.submitPurchaseCorrection(correctionTarget.value.id, payload)
  if (!outcome.ok) return

  correctionVisible.value = false
  correctionTarget.value = null
  successMessage.value = t('creditCards.correction.saved')
  await store.fetchPurchases(Number(props.cardId ?? route.params.card_id))
}

async function submitCreditEvent(payload) {
  if (!creditEventTarget.value) return

  const outcome = await store.submitCreditEvent(creditEventTarget.value.id, payload)
  if (!outcome.ok) return

  creditEventVisible.value = false
  creditEventTarget.value = null
  successMessage.value = t('creditCards.creditEvent.saved')
  await store.fetchPurchases(Number(props.cardId ?? route.params.card_id))
}

function openStatement(statement) {
  if (statement.id === null) return

  router.push({ name: 'credit-card-statement-detail', params: { statement_id: statement.id } })
}
</script>

<template>
  <section class="grid gap-5" data-test="credit-card-detail-view">
    <PageHeader
      :title="card?.name ?? t('creditCards.detail.title')"
      :description="cardIdentityLabel(card ?? {})"
    >
      <template #actions>
        <ElButton :icon="ArrowLeft" data-test="credit-card-detail-back" @click="goBack">
          {{ t('creditCards.detail.back') }}
        </ElButton>
        <ElButton
          type="primary"
          :icon="Plus"
          data-test="credit-card-purchase-create"
          @click="openPurchaseDialog"
        >
          {{ t('creditCards.purchase.title') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert
      v-if="store.error"
      type="error"
      :closable="false"
      :title="store.error.message"
      data-test="credit-card-detail-error"
    />
    <ElAlert
      v-if="successMessage"
      type="success"
      :closable="false"
      :title="successMessage"
      data-test="credit-card-purchase-success"
    />
    <ElSkeleton
      v-if="store.loading && !card"
      :rows="4"
      animated
      data-test="credit-card-detail-loading"
    />

    <template v-else-if="card">
      <dl
        class="m-0 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3"
        data-test="credit-card-detail-summary"
      >
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.summary.limit') }}
          </dt>
          <dd class="m-0 tabular-nums">
            {{ formatBRL(card.summary.credit_limit.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.summary.used') }}
          </dt>
          <dd class="m-0 tabular-nums">
            {{ formatBRL(card.summary.used_credit.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.summary.cardCredit') }}
          </dt>
          <dd class="m-0 tabular-nums" data-test="credit-card-detail-card-credit">
            {{ formatBRL(card.summary.card_credit.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.summary.available') }}
          </dt>
          <dd class="m-0 tabular-nums" data-test="credit-card-detail-available">
            {{ formatBRL(card.summary.available_credit.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.summary.billingDays') }}
          </dt>
          <dd class="m-0 tabular-nums">{{ billingCycleSummary(card).label }}</dd>
        </div>
      </dl>

      <p
        v-if="availablePresentation.isOverLimit"
        class="m-0 font-semibold text-[var(--el-color-danger)]"
        data-test="credit-card-detail-over-limit"
      >
        {{ t('creditCards.overLimit', { amount: availablePresentation.formatted }) }}
      </p>

      <section data-test="credit-card-current-statement">
        <h2 class="m-0 mb-2 text-base">{{ t('creditCards.detail.currentStatement') }}</h2>
        <template v-if="currentStatement">
          <p>
            <ElTag :type="statementStatus(currentStatement.status).tone">
              {{ t(statementStatus(currentStatement.status).labelKey) }}
            </ElTag>
            <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">
              {{ formatIsoDate(currentStatement.period_from) }} –
              {{ formatIsoDate(currentStatement.period_to) }}
            </span>
          </p>
          <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
            <div>
              <dt class="text-xs text-[var(--el-text-color-secondary)]">
                {{ t('creditCards.statement.outstanding') }}
              </dt>
              <dd class="m-0 tabular-nums" data-test="credit-card-current-outstanding">
                {{ formatBRL(currentStatement.outstanding_amount.amount_centavos) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-[var(--el-text-color-secondary)]">
                {{ t('creditCards.statement.closing') }}
              </dt>
              <dd class="m-0 tabular-nums">{{ formatIsoDate(currentStatement.closing_date) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-[var(--el-text-color-secondary)]">
                {{ t('creditCards.statement.due') }}
              </dt>
              <dd class="m-0 tabular-nums">{{ formatIsoDate(currentStatement.due_date) }}</dd>
            </div>
          </dl>
        </template>
      </section>

      <section data-test="credit-card-statements">
        <h2 class="m-0 mb-2 text-base">{{ t('creditCards.detail.statements') }}</h2>
        <ElEmpty
          v-if="store.statements.length === 0"
          :description="t('creditCards.statementsEmpty')"
        />
        <ul v-else class="m-0 grid list-none gap-2 p-0">
          <li v-for="statement in store.statements" :key="statement.id">
            <button
              type="button"
              class="flex w-full cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-[var(--el-border-color)] bg-transparent px-3 py-2 text-left"
              :data-test="`credit-card-statement-${statement.id}`"
              @click="openStatement(statement)"
            >
              <span>{{ formatIsoDate(statement.closing_date) }}</span>
              <ElTag :type="statementStatus(statement.status).tone" size="small">
                {{ t(statementStatus(statement.status).labelKey) }}
              </ElTag>
              <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
                formatBRL(statement.outstanding_amount.amount_centavos)
              }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section data-test="credit-card-purchases">
        <h2 class="m-0 mb-2 text-base">{{ t('creditCards.detail.purchases') }}</h2>
        <ElEmpty
          v-if="store.purchases.length === 0"
          :description="t('creditCards.purchasesEmpty')"
        />
        <ul v-else class="m-0 grid list-none gap-2 p-0">
          <li
            v-for="purchase in store.purchases"
            :key="purchase.id"
            :data-test="`credit-card-purchase-${purchase.id}`"
          >
            <div
              class="flex w-full flex-wrap items-center gap-2 rounded-lg border border-[var(--el-border-color)] px-3 py-2"
            >
              <span>{{ purchase.description }}</span>
              <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">
                {{ formatBRL(purchase.total_amount.amount_centavos) }} ·
                {{
                  installmentLabel(purchase.installments[0]?.sequence, purchase.installment_count)
                }}
                ·
                {{ formatIsoDate(purchase.purchase_date) }}
              </span>
              <ElTag
                v-if="purchase.installments[0]"
                :type="recognitionStatus(purchase.installments[0].recognition_status).tone"
                size="small"
              >
                {{ t(recognitionStatus(purchase.installments[0].recognition_status).labelKey) }}
              </ElTag>
              <ElButton
                v-if="purchase.is_directly_editable"
                size="small"
                :data-test="`credit-card-purchase-correct-${purchase.id}`"
                @click="openCorrection(purchase)"
              >
                {{ t('creditCards.correction.action') }}
              </ElButton>
              <ElButton
                size="small"
                type="warning"
                plain
                :data-test="`credit-card-purchase-credit-event-${purchase.id}`"
                @click="openCreditEvent(purchase)"
              >
                {{ t('creditCards.creditEvent.action') }}
              </ElButton>
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

    <CreditCardCorrectionDialog
      v-model:visible="correctionVisible"
      :purchase="correctionTarget"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @submit="submitCorrection"
    />

    <CreditCardCreditEventDialog
      v-model:visible="creditEventVisible"
      :purchase="creditEventTarget"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @submit="submitCreditEvent"
    />
  </section>
</template>
