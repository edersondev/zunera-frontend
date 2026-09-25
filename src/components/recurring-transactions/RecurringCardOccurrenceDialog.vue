<script setup>
import { computed, reactive, useTemplateRef, watch } from 'vue'
import { Check, CircleClose, Close, RefreshLeft } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import { cardIdentityLabel } from '@/utils/credit-cards/creditCardFormatters'
import { cardOccurrenceStateLabel } from '@/utils/recurring-transactions/recurringTransactionFormatters'

const props = defineProps({
  modelValue: Boolean,
  rule: { type: Object, default: null },
  occurrence: { type: Object, default: null },
  cards: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  saving: Boolean,
  error: { type: Object, default: null },
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'dismiss', 'retry'])
const { t } = useI18n()
const formRef = useTemplateRef('formRef')

const form = reactive({
  actual_amount_centavos: null,
  actual_purchase_date: null,
  credit_card_id: null,
  category_id: null,
  confirm_over_limit: false,
})

const activeCards = computed(() => props.cards.filter((card) => card.status === 'active'))
const expenseCategories = computed(() =>
  props.categories.filter((category) => category.status === 'active' && category.classification === 'expense'),
)
const isConfirmation = computed(() => props.occurrence?.generation_mode === 'confirmation')
const isAwaitingApproval = computed(() => props.occurrence?.state === 'awaiting_over_limit')
const isFailed = computed(() => props.occurrence?.state === 'failed')
const isActionable = computed(() => ['expected', 'awaiting_over_limit', 'failed'].includes(props.occurrence?.state))
const showChoices = computed(() => isConfirmation.value && isActionable.value)
const canConfirm = computed(() => isActionable.value && (isConfirmation.value || isAwaitingApproval.value))
const canRetry = computed(() => isFailed.value && !isConfirmation.value)
const overLimitCode = computed(() => props.error?.code === 'OVER_LIMIT_CONFIRMATION_REQUIRED')
const approvalRequired = computed(() => isAwaitingApproval.value || overLimitCode.value)
const actionInProgress = computed(() => props.error?.code === 'occurrence_action_in_progress')
const staleCredit = computed(() => props.error?.code === 'stale_over_limit_confirmation')
const selectedCard = computed(() => activeCards.value.find((card) => card.id === form.credit_card_id))
const futureDate = computed(() => Boolean(form.actual_purchase_date && form.actual_purchase_date > businessToday()))

function businessToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function isFutureDate(date) {
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return value > businessToday()
}

watch(
  () => [props.modelValue, props.occurrence],
  () => {
    if (!props.modelValue || !props.occurrence) return
    form.actual_amount_centavos = props.occurrence.actual_amount_centavos ?? props.occurrence.scheduled_amount_centavos ?? null
    form.actual_purchase_date = props.occurrence.actual_purchase_date ?? props.occurrence.scheduled_date ?? null
    form.credit_card_id = props.occurrence.card?.id ?? null
    form.category_id = props.occurrence.category?.id ?? null
    form.confirm_over_limit = false
  },
  { immediate: true },
)

function confirmPayload() {
  const payload = {}
  if (form.actual_amount_centavos != null) payload.actual_amount_centavos = Number(form.actual_amount_centavos)
  if (form.actual_purchase_date) payload.actual_purchase_date = form.actual_purchase_date
  if (form.credit_card_id != null) payload.credit_card_id = form.credit_card_id
  if (form.category_id != null) payload.category_id = form.category_id
  if (form.confirm_over_limit) payload.confirm_over_limit = true
  if (form.confirm_over_limit && selectedCard.value?.summary?.available_credit) {
    payload.expected_available_credit_centavos = selectedCard.value.summary.available_credit.amount_centavos
  }

  return payload
}

function submitConfirmation() {
  if (approvalRequired.value && !form.confirm_over_limit) return
  if (futureDate.value) return
  emit('confirm', confirmPayload())
}
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    :title="t('recurringTransactions.occurrenceReview')"
    width="min(92vw, 560px)"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="formRef?.clearValidate()"
  >
    <template v-if="occurrence">
      <p class="muted" data-test="occurrence-scheduled">
        {{ t('recurringTransactions.scheduledDate') }}: {{ occurrence.scheduled_date }}
      </p>
      <ElTag effect="plain" data-test="occurrence-state">{{ cardOccurrenceStateLabel(occurrence.state, t) }}</ElTag>

      <p v-if="occurrence.purchase_id" class="muted" data-test="occurrence-recorded-origin">
        {{ t('recurringTransactions.recordedPurchase', { id: occurrence.purchase_id }) }}
      </p>
      <ElAlert
        v-if="isFailed"
        type="error"
        :closable="false"
        show-icon
        :title="t('recurringTransactions.failedRetry')"
        data-test="occurrence-failed"
      />
      <template v-if="showChoices">
        <ElForm ref="formRef" label-position="top" class="mt-4">
          <div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
            <ElFormItem :label="t('recurringTransactions.amount')" :error="errors.actual_amount_centavos?.[0]">
              <CurrencyAmountInput v-model="form.actual_amount_centavos" data-test="occurrence-amount" />
            </ElFormItem>
            <ElFormItem :label="t('recurringTransactions.actualPurchaseDate')" :error="errors.actual_purchase_date?.[0]">
              <ElDatePicker v-model="form.actual_purchase_date" type="date" value-format="YYYY-MM-DD" :disabled-date="isFutureDate" data-test="occurrence-date" />
            </ElFormItem>
            <ElFormItem :label="t('recurringTransactions.creditCard')" :error="errors.credit_card_id?.[0]">
              <ElSelect v-model="form.credit_card_id" clearable data-test="occurrence-card">
                <ElOption v-for="card in activeCards" :key="card.id" :label="cardIdentityLabel(card)" :value="card.id" />
              </ElSelect>
            </ElFormItem>
            <ElFormItem :label="t('recurringTransactions.category')" :error="errors.category_id?.[0]">
              <ElSelect v-model="form.category_id" clearable data-test="occurrence-category">
                <ElOption v-for="category in expenseCategories" :key="category.id" :label="category.name" :value="category.id" />
              </ElSelect>
            </ElFormItem>
          </div>
        </ElForm>
      </template>

      <ElAlert
        v-if="approvalRequired"
        type="warning"
        :closable="false"
        show-icon
        :title="t('recurringTransactions.overLimitConfirm')"
        data-test="occurrence-over-limit"
      />
      <ElCheckbox v-if="approvalRequired" v-model="form.confirm_over_limit" data-test="occurrence-over-limit-approval">
        {{ t('recurringTransactions.approveOverLimit') }}
      </ElCheckbox>
      <ElAlert v-if="actionInProgress" type="warning" :closable="false" show-icon
        :title="t('recurringTransactions.actionInProgress')" data-test="occurrence-action-in-progress" />
      <ElAlert v-if="staleCredit" type="warning" :closable="false" show-icon
        :title="t('recurringTransactions.staleCredit')" data-test="occurrence-stale-credit" />
      <ElAlert v-if="futureDate" type="error" :closable="false" show-icon
        :title="t('recurringTransactions.futureDate')" data-test="occurrence-future-date" />
      <p class="muted" data-test="occurrence-recording-scope">{{ t('recurringTransactions.recordingScope') }}</p>

      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <ElButton type="danger" :icon="Close" :disabled="saving" data-test="occurrence-cancel"
          @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</ElButton>
        <ElButton
          v-if="isActionable"
          type="info"
          :icon="CircleClose"
          :disabled="saving"
          data-test="occurrence-dismiss"
          @click="emit('dismiss')"
        >
          {{ t('recurringTransactions.dismiss') }}
        </ElButton>
        <ElButton
          v-if="canRetry"
          :icon="RefreshLeft"
          :loading="saving"
          :disabled="saving"
          data-test="occurrence-retry"
          @click="emit('retry')"
        >
          {{ t('recurringTransactions.retry') }}
        </ElButton>
        <ElButton
          v-if="canConfirm"
          type="primary"
          :icon="isFailed ? RefreshLeft : Check"
          :loading="saving"
          :disabled="saving || futureDate || (approvalRequired && !form.confirm_over_limit)"
          data-test="occurrence-confirm"
          @click="submitConfirmation"
        >
          {{ isAwaitingApproval ? t('recurringTransactions.approve') : isFailed ? t('recurringTransactions.retry') : t('recurringTransactions.confirm') }}
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>
