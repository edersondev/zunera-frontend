<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import CreditCardStatementPaymentDialog from '@/components/credit-cards/CreditCardStatementPaymentDialog.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import {
  formatBRL,
  formatIsoDate,
  installmentLabel,
  paymentStatus,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({ statementId: { type: [String, Number], required: true } })
const store = useCreditCardStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const statement = computed(() => store.statement)
const paymentDialogVisible = shallowRef(false)
const editingPayment = shallowRef(null)
const successMessage = shallowRef('')
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
  successMessage.value = ''
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
  successMessage.value = t('creditCards.payment.saved')
}

async function removePayment(payment) {
  const outcome = await store.removeStatementPayment(payment.id)
  if (outcome.ok) successMessage.value = t('creditCards.payment.removed')
}

async function restorePayment(payment) {
  const outcome = await store.restoreStatementPayment(payment.id)
  if (outcome.ok) successMessage.value = t('creditCards.payment.restored')
}
</script>

<template>
  <section data-test="credit-card-statement-view">
    <PageHeader
      :title="t('creditCards.statementDetail.title')"
      :description="statement ? formatIsoDate(statement.closing_date) : ''"
    >
      <template #actions>
        <ElButton :icon="ArrowLeft" data-test="credit-card-statement-back" @click="goBack">{{
          t('creditCards.detail.back')
        }}</ElButton>
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
      v-if="successMessage"
      type="success"
      :closable="false"
      :title="successMessage"
      data-test="credit-card-payment-success"
    />
    <ElSkeleton v-if="store.loading && !statement" :rows="4" animated />

    <template v-else-if="statement">
      <p class="m-0 mb-2 flex flex-wrap items-center gap-2">
        <ElTag
          :type="statementStatus(statement.status).tone"
          data-test="credit-card-statement-status"
        >
          {{ t(statementStatus(statement.status).labelKey) }}
        </ElTag>
        <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">
          {{ formatIsoDate(statement.period_from) }} – {{ formatIsoDate(statement.period_to) }} ·
          {{ t('creditCards.statement.due') }} {{ formatIsoDate(statement.due_date) }}
        </span>
      </p>

      <dl
        class="m-0 mb-4 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3"
        data-test="credit-card-statement-totals"
      >
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.statement.original') }}
          </dt>
          <dd class="m-0 tabular-nums">
            {{ formatBRL(statement.original_amount.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.statement.creditAdjustments') }}
          </dt>
          <dd class="m-0 tabular-nums">
            {{ formatBRL(statement.credit_adjustments.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.statement.net') }}
          </dt>
          <dd class="m-0 tabular-nums">{{ formatBRL(statement.net_amount.amount_centavos) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.statement.paid') }}
          </dt>
          <dd class="m-0 tabular-nums">{{ formatBRL(statement.paid_amount.amount_centavos) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.statement.outstanding') }}
          </dt>
          <dd class="m-0 tabular-nums" data-test="credit-card-statement-outstanding">
            {{ formatBRL(statement.outstanding_amount.amount_centavos) }}
          </dd>
        </div>
      </dl>

      <section data-test="credit-card-statement-lines">
        <h2 class="m-0 mb-2 text-base">{{ t('creditCards.statementDetail.lines') }}</h2>
        <ElEmpty
          v-if="statement.installments.length === 0"
          :description="t('creditCards.statementsEmpty')"
        />
        <ul v-else class="m-0 grid list-none gap-2 p-0">
          <li
            v-for="installment in statement.installments"
            :key="installment.id"
            class="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--el-border-color)] px-3 py-2"
            :data-test="`credit-card-line-${installment.id}`"
          >
            <span>{{ installmentLabel(installment.sequence, installment.total_count) }}</span>
            <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
              installment.statement?.card?.name
            }}</span>
            <span>{{ formatBRL(installment.amount.amount_centavos) }}</span>
          </li>
        </ul>
      </section>

      <section data-test="credit-card-statement-payments">
        <h2 class="m-0 mb-2 text-base">{{ t('creditCards.statementDetail.payments') }}</h2>
        <ElEmpty
          v-if="statement.payments.length === 0"
          :description="t('creditCards.statementDetail.paymentsEmpty')"
        />
        <ul v-else class="m-0 grid list-none gap-2 p-0">
          <li
            v-for="payment in activePayments"
            :key="payment.id"
            class="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--el-border-color)] px-3 py-2"
            :data-test="`credit-card-payment-${payment.id}`"
          >
            <span>{{ formatIsoDate(payment.payment_date) }}</span>
            <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
              payment.financial_account.name
            }}</span>
            <ElTag :type="paymentStatus(payment.status).tone" size="small">{{
              t(paymentStatus(payment.status).labelKey)
            }}</ElTag>
            <span>{{ formatBRL(payment.amount.amount_centavos) }}</span>
            <ElButton
              size="small"
              :data-test="`credit-card-payment-edit-${payment.id}`"
              @click="openPaymentDialog(payment)"
            >
              {{ t('common.edit') }}
            </ElButton>
            <ElButton
              size="small"
              type="danger"
              plain
              :data-test="`credit-card-payment-remove-${payment.id}`"
              @click="removePayment(payment)"
            >
              {{ t('creditCards.payment.remove') }}
            </ElButton>
          </li>
        </ul>

        <template v-if="removedPayments.length > 0">
          <h3 class="m-0 mt-3 mb-2 text-sm">{{ t('creditCards.payment.removedSection') }}</h3>
          <ul class="m-0 grid list-none gap-2 p-0">
            <li
              v-for="payment in removedPayments"
              :key="payment.id"
              class="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--el-border-color)] px-3 py-2"
              :data-test="`credit-card-payment-removed-${payment.id}`"
            >
              <span>{{ formatIsoDate(payment.payment_date) }}</span>
              <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
                payment.financial_account.name
              }}</span>
              <span>{{ formatBRL(payment.amount.amount_centavos) }}</span>
              <ElButton
                size="small"
                :data-test="`credit-card-payment-restore-${payment.id}`"
                @click="restorePayment(payment)"
              >
                {{ t('creditCards.payment.restore') }}
              </ElButton>
            </li>
          </ul>
        </template>
      </section>

      <section data-test="credit-card-statement-credit-events">
        <h2 class="m-0 mb-2 text-base">{{ t('creditCards.statementDetail.creditEvents') }}</h2>
        <ElEmpty
          v-if="creditEvents.length === 0"
          :description="t('creditCards.statementDetail.creditEventsEmpty')"
        />
        <ul v-else class="m-0 grid list-none gap-2 p-0">
          <li
            v-for="event in creditEvents"
            :key="event.id"
            class="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--el-border-color)] px-3 py-2"
            :data-test="`credit-card-credit-event-${event.id}`"
          >
            <span>{{ t(`creditCards.creditEventReason.${event.reason}`) }}</span>
            <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
              formatIsoDate(event.event_date)
            }}</span>
            <span>{{ formatBRL(event.amount.amount_centavos) }}</span>
            <ul v-if="event.statementApplications.length > 0" class="m-0 basis-full pl-4">
              <li
                v-for="application in event.statementApplications"
                :key="`${event.id}-${application.statement_id}-${application.installment_id}`"
                :data-test="`credit-card-credit-application-${event.id}-${application.statement_id}`"
              >
                {{
                  t('creditCards.statementDetail.creditApplied', {
                    amount: formatBRL(application.amount.amount_centavos),
                  })
                }}
              </li>
            </ul>
          </li>
        </ul>
      </section>
    </template>

    <CreditCardStatementPaymentDialog
      v-model:visible="paymentDialogVisible"
      :statement="statement"
      :payment="editingPayment"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @submit="submitPayment"
    />
  </section>
</template>
