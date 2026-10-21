<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { ElAlert, ElButton, ElSkeleton } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import { showActionSuccess } from '@/services/actionMessage'
import CreditCardStatementBreakdown from '@/components/credit-cards/CreditCardStatementBreakdown.vue'
import CreditCardStatementCreditEvents from '@/components/credit-cards/CreditCardStatementCreditEvents.vue'
import CreditCardCorrectionDialog from '@/components/credit-cards/CreditCardCorrectionDialog.vue'
import CreditCardCreditEventDialog from '@/components/credit-cards/CreditCardCreditEventDialog.vue'
import CreditCardPurchaseMoveDialog from '@/components/credit-cards/CreditCardPurchaseMoveDialog.vue'
import CreditCardPurchaseDeleteDialog from '@/components/credit-cards/CreditCardPurchaseDeleteDialog.vue'
import CreditCardStatementLineItems from '@/components/credit-cards/CreditCardStatementLineItems.vue'
import CreditCardStatementPaymentDialog from '@/components/credit-cards/CreditCardStatementPaymentDialog.vue'
import CreditCardStatementPayments from '@/components/credit-cards/CreditCardStatementPayments.vue'
import CreditCardStatementSummary from '@/components/credit-cards/CreditCardStatementSummary.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import { cardIdentityLabel, formatStatementMonth } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({ statementId: { type: [String, Number], required: true } })
const store = useCreditCardStore()
const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const statement = computed(() => store.statement)
const paymentDialogVisible = shallowRef(false)
const editingPayment = shallowRef(null)
const actionMessage = shallowRef('')
const correctionTarget = shallowRef(null)
const creditEventTarget = shallowRef(null)
const correctionVisible = shallowRef(false)
const creditEventVisible = shallowRef(false)
const loadingPurchaseId = shallowRef(null)
const moveTarget = shallowRef(null)
const moveInstallmentId = shallowRef(null)
const moveVisible = shallowRef(false)
const deleteTarget = shallowRef(null)
const deleteVisible = shallowRef(false)

function openRecurrenceSource(installment) {
  const source = installment?.recurrence_source
  if (!source?.recurring_transaction_id) return

  router.push({ name: 'recurring-transactions', query: { highlight: source.recurring_transaction_id } })
}

const statementTitle = computed(() => {
  const month = formatStatementMonth(statement.value?.closing_date, locale.value)

  return month ? t('creditCards.statementDetail.monthTitle', { month }) : t('creditCards.statementDetail.title')
})
const statementIdentity = computed(() => cardIdentityLabel(statement.value?.card))
const payable = computed(() =>
  ['closed', 'partially_paid', 'overdue'].includes(statement.value?.status ?? ''),
)
const activePayments = computed(() =>
  (statement.value?.payments ?? []).filter((payment) => !payment.is_removed),
)
const removedPayments = computed(() =>
  (statement.value?.payments ?? []).filter((payment) => payment.is_removed),
)
const creditEvents = computed(() =>
  (statement.value?.credit_events ?? []).map((event) => ({
    ...event,
    statementApplications: (event.applications ?? []).filter(
      (application) => application.statement_id === statement.value?.id,
    ),
  })),
)

onMounted(() => store.fetchStatement(Number(props.statementId ?? route.params.statement_id)))

function goBack() {
  if (store.card) {
    router.push({ name: 'credit-card-detail', params: { card_id: store.card.id } })

    return
  }

  router.push({ name: 'credit-cards' })
}

function openPaymentDialog(payment = null) {
  editingPayment.value = payment
  paymentDialogVisible.value = true
}

async function submitPayment(payload) {
  const outcome = editingPayment.value
    ? await store.editPayment(editingPayment.value.id, payload)
    : await store.submitPayment(Number(props.statementId ?? route.params.statement_id), payload)
  if (!outcome.ok) return

  paymentDialogVisible.value = false
  editingPayment.value = null
  showActionSuccess(t('creditCards.payment.saved'))
}

async function removePayment(payment) {
  const outcome = await store.removeStatementPayment(payment.id)
  if (outcome.ok) showActionSuccess(t('creditCards.payment.removed'))
}

async function restorePayment(payment) {
  const outcome = await store.restoreStatementPayment(payment.id)
  if (outcome.ok) showActionSuccess(t('creditCards.payment.restored'))
}

async function openPurchaseAction(installment, action) {
  if (loadingPurchaseId.value !== null || store.submitting || !installment.purchase_id) return
  actionMessage.value = ''
  store.dismissMutationError()
  loadingPurchaseId.value = installment.purchase_id

  try {
    const purchase = await store.fetchPurchase(installment.purchase_id)
    if (!purchase || purchase.id !== installment.purchase_id) return

    if (action === 'correct') {
      if (!purchase.is_directly_editable) {
        actionMessage.value = t('creditCards.statementDetail.correctionUnavailable')
        return
      }
      correctionTarget.value = purchase
      correctionVisible.value = true
    } else if (action === 'move') {
      store.clearStatementOptions()
      store.clearMovePreview()
      store.clearMoveHistory()
      moveTarget.value = purchase
      moveInstallmentId.value = installment.id
      moveVisible.value = true
      store.fetchMoveHistory(purchase.id)
    } else if (action === 'delete') {
      deleteTarget.value = purchase
      deleteVisible.value = true
    } else {
      creditEventTarget.value = purchase
      creditEventVisible.value = true
    }
  } finally {
    loadingPurchaseId.value = null
  }
}

function requestStatementOptions({ cardId, purchaseDate, fromMonth }) {
  if (!fromMonth) store.clearStatementOptions()
  return store.fetchStatementOptions(cardId, {
    purchase_date: purchaseDate,
    ...(fromMonth ? { from_month: fromMonth } : {}),
  })
}

async function submitMove(payload) {
  if (!moveTarget.value) return
  const cardId = moveTarget.value.card.id
  const outcome = await store.submitMove(
    moveTarget.value.id, payload, cardId, Number(props.statementId ?? route.params.statement_id),
  )
  if (!outcome.ok) return
  moveVisible.value = false
  moveTarget.value = null
  showActionSuccess(t('creditCards.move.saved'))
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const outcome = await store.submitDeletePurchase(
    deleteTarget.value.id, deleteTarget.value.card.id, Number(props.statementId ?? route.params.statement_id),
  )
  if (!outcome.ok) return
  deleteVisible.value = false
  deleteTarget.value = null
  showActionSuccess(t('creditCards.delete.saved'))
}

async function submitCorrection(payload) {
  if (!correctionTarget.value) return

  const outcome = await store.submitPurchaseCorrection(correctionTarget.value.id, payload)
  if (!outcome.ok) return

  correctionVisible.value = false
  correctionTarget.value = null
  showActionSuccess(t('creditCards.correction.saved'))
  await store.fetchStatement(Number(props.statementId ?? route.params.statement_id))
}

async function submitCreditEvent(payload) {
  if (!creditEventTarget.value) return

  const outcome = await store.submitCreditEvent(creditEventTarget.value.id, payload)
  if (!outcome.ok) return

  creditEventVisible.value = false
  creditEventTarget.value = null
  showActionSuccess(t('creditCards.creditEvent.saved'))
  await store.fetchStatement(Number(props.statementId ?? route.params.statement_id))
}
</script>

<template>
  <section class="statement-detail" data-test="credit-card-statement-view">
    <PageHeader :title="statementTitle" :description="statementIdentity">
      <template #actions>
        <ElButton :icon="ArrowLeft" data-test="credit-card-statement-back" @click="goBack">
          {{ t('creditCards.detail.back') }}
        </ElButton>
        <ElButton
          v-if="payable"
          type="primary"
          :icon="Plus"
          data-test="credit-card-payment-create"
          @click="openPaymentDialog()"
        >
          {{ t('creditCards.payment.title') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert
      v-if="store.error"
      type="error"
      :closable="false"
      :title="store.error.message"
      data-test="credit-card-statement-error"
    />
    <ElAlert
      v-if="actionMessage"
      type="warning"
      :closable="false"
      :title="actionMessage"
      data-test="credit-card-statement-action-message"
    />
    <ElSkeleton v-if="store.loading && !statement" :rows="6" animated />

    <div v-else-if="statement" class="statement-content">
      <CreditCardStatementSummary :statement="statement" />
      <CreditCardStatementBreakdown :statement="statement" />
      <CreditCardStatementLineItems
        :installments="statement.installments"
        :statement-amount-centavos="statement.net_amount?.amount_centavos"
        :card="statement.card"
        :statement="statement"
        :action-loading="loadingPurchaseId !== null || store.submitting"
        @correct="openPurchaseAction($event, 'correct')"
        @refund="openPurchaseAction($event, 'refund')"
        @move="openPurchaseAction($event, 'move')"
        @delete="openPurchaseAction($event, 'delete')"
        @navigate-source="openRecurrenceSource"
      />
      <CreditCardStatementPayments
        :payments="activePayments"
        :removed-payments="removedPayments"
        @edit="openPaymentDialog"
        @remove="removePayment"
        @restore="restorePayment"
      />
      <CreditCardStatementCreditEvents :events="creditEvents" />
    </div>

    <CreditCardStatementPaymentDialog
      v-model:visible="paymentDialogVisible"
      :statement="statement"
      :payment="editingPayment"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @submit="submitPayment"
      @dismiss-mutation-error="store.dismissMutationError"
    />
    <CreditCardCorrectionDialog
      v-model:visible="correctionVisible"
      :purchase="correctionTarget"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @submit="submitCorrection"
      @dismiss-mutation-error="store.dismissMutationError"
    />
    <CreditCardCreditEventDialog
      v-model:visible="creditEventVisible"
      :purchase="creditEventTarget"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @submit="submitCreditEvent"
      @dismiss-mutation-error="store.dismissMutationError"
    />
    <CreditCardPurchaseMoveDialog
      v-model:visible="moveVisible"
      focus-fallback-selector="[data-test='credit-card-statement-back']"
      :purchase="moveTarget"
      :initial-installment-id="moveInstallmentId"
      :options="store.statementOptions"
      :options-loading="store.optionsLoading"
      :options-error="store.optionsError"
      :preview="store.movePreview"
      :preview-loading="store.previewLoading"
      :preview-error="store.previewError"
      :mutation-error="store.mutationError"
      :history="store.moveHistory"
      :submitting="store.submitting"
      @request-options="requestStatementOptions"
      @request-preview="store.previewMove(moveTarget.id, $event)"
      @clear-preview="store.clearMovePreview()"
      @confirm="submitMove"
    />
    <CreditCardPurchaseDeleteDialog
      v-model:visible="deleteVisible"
      focus-fallback-selector="[data-test='credit-card-statement-back']"
      :purchase="deleteTarget"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.statement-detail {
  display: grid;
  gap: 16px;
}

.statement-content {
  display: grid;
  gap: 32px;
}

@media (max-width: 639px) {
  .statement-content {
    gap: 24px;
  }
}
</style>
