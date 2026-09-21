<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
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
import { businessToday, formatBRL } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  visible: { type: Boolean, default: false },
  purchase: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  mutationError: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const REASONS = ['refund', 'correction', 'cancellation']

const form = reactive({
  reason: 'refund',
  amount_centavos: null,
  event_date: businessToday(),
  notes: '',
})

const fieldErrors = computed(() => props.mutationError?.errors ?? {})
const errorMessage = computed(() =>
  props.mutationError && !Object.keys(fieldErrors.value).length ? props.mutationError.message : '',
)
const uncreditedCentavos = computed(() => {
  const purchase = props.purchase
  if (!purchase) return 0

  const credited = (purchase.credit_events ?? []).reduce(
    (total, event) => total + (event.amount?.amount_centavos ?? 0),
    0,
  )

  return Math.max(0, purchase.total_amount.amount_centavos - credited)
})

watch(
  () => [props.visible, props.purchase],
  ([visible]) => {
    if (!visible) return
    form.reason = 'refund'
    form.amount_centavos = uncreditedCentavos.value
    form.event_date = businessToday()
    form.notes = ''
    formRef.value?.clearValidate?.()
  },
  { immediate: true },
)

function submit() {
  emit('submit', {
    reason: form.reason,
    amount_centavos: form.amount_centavos,
    event_date: form.event_date,
    notes: form.notes.trim() === '' ? null : form.notes.trim(),
  })
}

function close() {
  formRef.value?.clearValidate?.()
  emit('update:visible', false)
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    :title="t('creditCards.creditEvent.title')"
    data-test="credit-card-credit-event-dialog"
    @close="close"
  >
    <ElAlert
      v-if="errorMessage"
      type="error"
      :closable="false"
      :title="errorMessage"
      data-test="credit-card-credit-event-error"
    />

    <p class="credit-event__hint" data-test="credit-card-credit-event-limit">
      {{ t('creditCards.creditEvent.uncredited', { amount: formatBRL(uncreditedCentavos) }) }}
    </p>

    <ElForm ref="formRef" label-position="top" @submit.prevent>
      <ElFormItem :label="t('creditCards.creditEvent.reason')" :error="fieldErrors.reason?.[0]">
        <ElSelect v-model="form.reason" data-test="credit-card-credit-event-reason">
          <ElOption
            v-for="reason in REASONS"
            :key="reason"
            :label="t(`creditCards.creditEventReason.${reason}`)"
            :value="reason"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem
        :label="t('creditCards.creditEvent.amount')"
        :error="fieldErrors.amount_centavos?.[0]"
      >
        <CurrencyAmountInput
          v-model="form.amount_centavos"
          data-test="credit-card-credit-event-amount"
        />
      </ElFormItem>

      <ElFormItem :label="t('creditCards.creditEvent.date')" :error="fieldErrors.event_date?.[0]">
        <ElDatePicker
          v-model="form.event_date"
          value-format="YYYY-MM-DD"
          data-test="credit-card-credit-event-date"
        />
      </ElFormItem>

      <ElFormItem :label="t('creditCards.creditEvent.notes')" :error="fieldErrors.notes?.[0]">
        <ElInput
          v-model="form.notes"
          type="textarea"
          maxlength="1000"
          data-test="credit-card-credit-event-notes"
        />
      </ElFormItem>
    </ElForm>

    <p class="credit-event__hint">{{ t('creditCards.creditEvent.hint') }}</p>

    <template #footer>
      <ElButton type="danger" data-test="credit-card-credit-event-cancel" @click="close">{{
        t('common.cancel')
      }}</ElButton>
      <ElButton
        type="primary"
        :loading="submitting"
        data-test="credit-card-credit-event-submit"
        @click="submit"
      >
        {{ t('common.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.credit-event__hint {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}
</style>
