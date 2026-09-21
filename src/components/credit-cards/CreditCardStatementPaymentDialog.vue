<script setup>
import { computed, onMounted, reactive, shallowRef, watch } from 'vue'
import {
  ElAlert,
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
} from 'element-plus'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import { listFinancialAccounts } from '@/services/financialAccountService'
import { businessToday, formatBRL, formatIsoDate } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  visible: { type: Boolean, default: false },
  statement: { type: Object, default: null },
  payment: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  mutationError: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const accounts = shallowRef([])
const accountsError = shallowRef(null)

const form = reactive({
  financial_account_id: null,
  amount_centavos: null,
  payment_date: businessToday(),
  notes: '',
})

const isEditing = computed(() => props.payment !== null)
const fieldErrors = computed(() => props.mutationError?.errors ?? {})
const errorMessage = computed(() =>
  props.mutationError && !Object.keys(fieldErrors.value).length ? props.mutationError.message : '',
)
const outstandingCentavos = computed(() => {
  if (!props.statement) return 0

  const outstanding = props.statement.outstanding_amount?.amount_centavos ?? 0
  const ownPayment =
    isEditing.value && !props.payment?.is_removed ? props.payment.amount.amount_centavos : 0

  return outstanding + ownPayment
})
const remainingAfterPayment = computed(() =>
  Math.max(0, outstandingCentavos.value - (form.amount_centavos ?? 0)),
)

onMounted(loadAccounts)

watch(
  () => [props.visible, props.payment],
  ([visible]) => {
    if (visible) resetForm()
  },
  { immediate: true },
)

async function loadAccounts() {
  try {
    accounts.value = await listFinancialAccounts('active')
  } catch (requestError) {
    accountsError.value = requestError
  }
}

function resetForm() {
  form.financial_account_id = props.payment?.financial_account?.id ?? null
  form.amount_centavos = props.payment?.amount?.amount_centavos ?? outstandingCentavos.value
  form.payment_date = props.payment?.payment_date ?? businessToday()
  form.notes = props.payment?.notes ?? ''
  formRef.value?.clearValidate?.()
}

function close() {
  formRef.value?.clearValidate?.()
  emit('update:visible', false)
}

function submit() {
  emit('submit', {
    financial_account_id: form.financial_account_id,
    amount_centavos: form.amount_centavos,
    payment_date: form.payment_date,
    notes: form.notes.trim() === '' ? null : form.notes.trim(),
  })
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    :title="isEditing ? t('creditCards.payment.editTitle') : t('creditCards.payment.title')"
    data-test="credit-card-payment-dialog"
    @close="close"
  >
    <ElAlert
      v-if="errorMessage"
      type="error"
      :closable="false"
      :title="errorMessage"
      data-test="credit-card-payment-error"
    />
    <ElAlert
      v-if="accountsError"
      type="error"
      :closable="false"
      :title="accountsError.message"
      data-test="credit-card-payment-account-error"
    />

    <p class="payment-dialog__outstanding" data-test="credit-card-payment-outstanding">
      {{ t('creditCards.payment.outstanding', { amount: formatBRL(outstandingCentavos) }) }}
      <span v-if="statement" class="payment-dialog__due">
        {{ t('creditCards.statement.due') }} {{ formatIsoDate(statement.due_date) }}
      </span>
    </p>

    <ElForm ref="formRef" label-position="top" @submit.prevent>
      <ElFormItem
        :label="t('creditCards.payment.account')"
        :error="fieldErrors.financial_account_id?.[0]"
      >
        <ElSelect v-model="form.financial_account_id" data-test="credit-card-payment-account">
          <ElOption
            v-for="account in accounts"
            :key="account.id"
            :label="account.name"
            :value="account.id"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem
        :label="t('creditCards.payment.amount')"
        :error="fieldErrors.amount_centavos?.[0]"
      >
        <CurrencyAmountInput
          v-model="form.amount_centavos"
          data-test="credit-card-payment-amount"
        />
        <span class="payment-dialog__hint" data-test="credit-card-payment-remaining">
          {{
            t('creditCards.payment.remainingAfter', { amount: formatBRL(remainingAfterPayment) })
          }}
        </span>
      </ElFormItem>

      <ElFormItem :label="t('creditCards.payment.date')" :error="fieldErrors.payment_date?.[0]">
        <ElDatePicker
          v-model="form.payment_date"
          value-format="YYYY-MM-DD"
          data-test="credit-card-payment-date"
        />
      </ElFormItem>

      <ElFormItem :label="t('creditCards.payment.notes')" :error="fieldErrors.notes?.[0]">
        <ElInput
          v-model="form.notes"
          type="textarea"
          maxlength="1000"
          data-test="credit-card-payment-notes"
        />
      </ElFormItem>
    </ElForm>

    <p class="payment-dialog__hint">{{ t('creditCards.payment.settlementHint') }}</p>

    <template #footer>
      <ElButton type="danger" data-test="credit-card-payment-cancel" @click="close">{{
        t('common.cancel')
      }}</ElButton>
      <ElButton
        type="primary"
        :loading="submitting"
        data-test="credit-card-payment-submit"
        @click="submit"
      >
        {{ t('common.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.payment-dialog__outstanding {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  margin: 0 0 0.75rem;
  font-variant-numeric: tabular-nums;
}

.payment-dialog__due,
.payment-dialog__hint {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}
</style>
