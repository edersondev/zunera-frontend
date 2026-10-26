<script setup>
import { computed, shallowRef, watch } from 'vue'
import { ElAlert, ElButton, ElSkeleton } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import { showActionSuccess } from '@/services/actionMessage'
import CreditCardCurrentStatementCard from '@/components/credit-cards/CreditCardCurrentStatementCard.vue'
import CreditCardDetailOverview from '@/components/credit-cards/CreditCardDetailOverview.vue'
import CreditCardPurchaseForm from '@/components/credit-cards/CreditCardPurchaseForm.vue'
import CreditCardPurchaseList from '@/components/credit-cards/CreditCardPurchaseList.vue'
import CreditCardCorrectionDialog from '@/components/credit-cards/CreditCardCorrectionDialog.vue'
import CreditCardCreditEventDialog from '@/components/credit-cards/CreditCardCreditEventDialog.vue'
import CreditCardPurchaseMoveDialog from '@/components/credit-cards/CreditCardPurchaseMoveDialog.vue'
import CreditCardPurchaseDeleteDialog from '@/components/credit-cards/CreditCardPurchaseDeleteDialog.vue'
import CreditCardStatementHistory from '@/components/credit-cards/CreditCardStatementHistory.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import {
  cardIdentityLabel,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({ cardId: { type: [String, Number], required: true } })
const store = useCreditCardStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const card = computed(() => store.card?.id === Number(props.cardId ?? route.params.card_id) ? store.card : null)
const currentStatement = computed(() => card.value?.current_statement ?? null)
const purchaseDialogVisible = shallowRef(false)
const createdPurchase = shallowRef(null)
const correctionTarget = shallowRef(null)
const creditEventTarget = shallowRef(null)
const correctionVisible = shallowRef(false)
const creditEventVisible = shallowRef(false)
const moveTarget = shallowRef(null)
const moveVisible = shallowRef(false)
const deleteTarget = shallowRef(null)
const deleteVisible = shallowRef(false)

function openRecurrenceSource(purchase) {
  const source = purchase?.recurrence_source
  if (!source?.recurring_transaction_id) return

  router.push({ name: 'recurring-transactions', query: { highlight: source.recurring_transaction_id } })
}

watch(() => Number(props.cardId ?? route.params.card_id), async (id) => {
  await Promise.allSettled([store.fetchCard(id), store.fetchStatements(id), store.fetchPurchases(id)])
}, { immediate: true })

function goBack() {
  router.push({ name: 'credit-cards' })
}

function openPurchaseDialog() {
  createdPurchase.value = null
  store.dismissOverLimit()
  store.clearStatementOptions()
  store.dismissMutationError()
  purchaseDialogVisible.value = true
}

function requestStatementOptions({ cardId, purchaseDate, fromMonth }) {
  if (!fromMonth) store.clearStatementOptions()
  return store.fetchStatementOptions(cardId, {
    purchase_date: purchaseDate,
    ...(fromMonth ? { from_month: fromMonth } : {}),
  })
}

function openMove(purchase) {
  store.dismissMutationError()
  store.clearStatementOptions()
  store.clearMovePreview()
  store.clearMoveHistory()
  moveTarget.value = purchase
  moveVisible.value = true
  store.fetchMoveHistory(purchase.id)
}

async function submitMove(payload) {
  if (!moveTarget.value) return
  const outcome = await store.submitMove(moveTarget.value.id, payload, Number(props.cardId ?? route.params.card_id))
  if (!outcome.ok) return
  moveVisible.value = false
  moveTarget.value = null
  showActionSuccess(t('creditCards.move.saved'))
}

function openDelete(purchase) {
  store.dismissMutationError()
  deleteTarget.value = purchase
  deleteVisible.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const outcome = await store.submitDeletePurchase(deleteTarget.value.id, Number(props.cardId ?? route.params.card_id))
  if (!outcome.ok) return
  deleteVisible.value = false
  deleteTarget.value = null
  showActionSuccess(t('creditCards.delete.saved'))
}

async function submitPurchase(payload) {
  const cardId = Number(props.cardId ?? route.params.card_id)
  const outcome = await store.submitPurchase(cardId, payload)
  if (outcome.ok) {
    createdPurchase.value = outcome.purchase
    showActionSuccess(t('creditCards.purchase.created'))
    purchaseDialogVisible.value = false
  }
}

async function confirmOverLimit() {
  const outcome = await store.submitOverLimit()
  if (outcome.ok) {
    createdPurchase.value = outcome.purchase
    showActionSuccess(t('creditCards.purchase.created'))
    purchaseDialogVisible.value = false
  }
}

function openCorrection(purchase) {
  correctionTarget.value = purchase
  correctionVisible.value = true
}

function openCreditEvent(purchase) {
  creditEventTarget.value = purchase
  creditEventVisible.value = true
}

async function submitCorrection(payload) {
  if (!correctionTarget.value) return

  const outcome = await store.submitPurchaseCorrection(correctionTarget.value.id, payload)
  if (!outcome.ok) return

  correctionVisible.value = false
  correctionTarget.value = null
  showActionSuccess(t('creditCards.correction.saved'))
  await store.fetchPurchases(Number(props.cardId ?? route.params.card_id))
}

async function submitCreditEvent(payload) {
  if (!creditEventTarget.value) return

  const outcome = await store.submitCreditEvent(creditEventTarget.value.id, payload)
  if (!outcome.ok) return

  creditEventVisible.value = false
  creditEventTarget.value = null
  showActionSuccess(t('creditCards.creditEvent.saved'))
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
    <ElSkeleton
      v-if="store.loading && !card"
      :rows="4"
      animated
      data-test="credit-card-detail-loading"
    />

    <template v-else-if="card">
      <CreditCardDetailOverview :card="card" />

      <CreditCardCurrentStatementCard
        :statement="currentStatement"
        @open="openStatement"
      />

      <CreditCardStatementHistory
        :statements="store.statements"
        @open="openStatement"
      />

      <CreditCardPurchaseList
        :purchases="store.purchases"
        :loading="store.submitting"
        :purchase-loading="store.purchaseLoading"
        :loading-more="store.purchaseLoadingMore"
        :has-more="store.hasMorePurchases"
        :load-error="store.purchaseLoadError"
        :reset-key="store.purchaseListVersion"
        @load-more="store.loadMorePurchases(Number(props.cardId ?? route.params.card_id))"
        @retry="store.retryPurchases(Number(props.cardId ?? route.params.card_id))"
        @correct="openCorrection"
        @refund="openCreditEvent"
        @move="openMove"
        @history="openMove"
        @delete="openDelete"
        @navigate-source="openRecurrenceSource"
      />
    </template>

    <CreditCardPurchaseForm
      v-model:visible="purchaseDialogVisible"
      :card="card"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      :over-limit="store.pendingOverLimit"
      :created-purchase="createdPurchase"
      :statement-options="store.statementOptions"
      :options-loading="store.optionsLoading"
      :options-error="store.optionsError"
      @submit="submitPurchase"
      @request-statement-options="requestStatementOptions"
      @confirm-over-limit="confirmOverLimit"
      @dismiss-over-limit="store.dismissOverLimit()"
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
      focus-fallback-selector="[data-test='credit-card-detail-back']"
      :purchase="moveTarget"
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
      focus-fallback-selector="[data-test='credit-card-detail-back']"
      :purchase="deleteTarget"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @confirm="confirmDelete"
    />
  </section>
</template>
