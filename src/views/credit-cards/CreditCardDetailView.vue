<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { ElAlert, ElButton, ElSkeleton } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import CreditCardCurrentStatementCard from '@/components/credit-cards/CreditCardCurrentStatementCard.vue'
import CreditCardDetailOverview from '@/components/credit-cards/CreditCardDetailOverview.vue'
import CreditCardPurchaseForm from '@/components/credit-cards/CreditCardPurchaseForm.vue'
import CreditCardPurchaseList from '@/components/credit-cards/CreditCardPurchaseList.vue'
import CreditCardCorrectionDialog from '@/components/credit-cards/CreditCardCorrectionDialog.vue'
import CreditCardCreditEventDialog from '@/components/credit-cards/CreditCardCreditEventDialog.vue'
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

const card = computed(() => store.card)
const currentStatement = computed(() => card.value?.current_statement ?? null)
const purchaseDialogVisible = shallowRef(false)
const createdPurchase = shallowRef(null)
const successMessage = shallowRef('')
const correctionTarget = shallowRef(null)
const creditEventTarget = shallowRef(null)
const correctionVisible = shallowRef(false)
const creditEventVisible = shallowRef(false)

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
  const cardId = Number(props.cardId ?? route.params.card_id)
  const outcome = await store.submitPurchase(cardId, payload)
  if (outcome.ok) {
    createdPurchase.value = outcome.purchase
    successMessage.value = t('creditCards.purchase.created')
    purchaseDialogVisible.value = false
    await refreshCardActivity(cardId)
  }
}

async function confirmOverLimit() {
  const cardId = Number(props.cardId ?? route.params.card_id)
  const outcome = await store.submitOverLimit()
  if (outcome.ok) {
    createdPurchase.value = outcome.purchase
    successMessage.value = t('creditCards.purchase.created')
    purchaseDialogVisible.value = false
    await refreshCardActivity(cardId)
  }
}

async function refreshCardActivity(cardId) {
  await Promise.allSettled([store.fetchStatements(cardId), store.fetchPurchases(cardId)])
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
        @correct="openCorrection"
        @refund="openCreditEvent"
      />
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
  </section>
</template>
