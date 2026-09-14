<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import {
  destinationSideOptions,
  sideLabel,
  sourceSideOptions,
  transferStatusOptions,
} from '@/utils/transfers/transferOptions'

const props = defineProps({
  modelValue: Boolean,
  transfer: { type: Object, default: null },
  accounts: { type: Array, required: true },
  saving: Boolean,
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const form = reactive(blank())
const original = shallowRef(blank())
const statuses = computed(() => transferStatusOptions(t))
const title = computed(() =>
  props.transfer ? t('transfers.editDialog') : t('transfers.newDialog'),
)
const sourceOptions = computed(() => sourceSideOptions(props.accounts, props.transfer))
const destinationOptions = computed(() =>
  destinationSideOptions(props.accounts, props.transfer, form.source_financial_account_id),
)
const sidesMustDiffer = computed(
  () =>
    form.source_financial_account_id !== null &&
    form.source_financial_account_id === form.destination_financial_account_id,
)
/**
 * An already-effective transfer retimed into the future keeps its balance effect
 * and only reports a notice, so the form tells the user before they save.
 */
const futureEffectiveNotice = computed(
  () => Boolean(props.transfer) && form.status === 'effective' && form.transfer_date > today(),
)
const pendingForFuture = computed(
  () => !props.transfer && form.status === 'pending' && form.transfer_date > today(),
)
const hasChanges = computed(() =>
  Object.entries(form).some(([key, value]) => value !== original.value[key]),
)
const rules = computed(() => ({
  source_financial_account_id: [
    { required: true, message: t('transfers.sourceRequired'), trigger: 'change' },
  ],
  destination_financial_account_id: [
    { required: true, message: t('transfers.destinationRequired'), trigger: 'change' },
  ],
}))

function today() {
  return new Date().toISOString().slice(0, 10)
}

function blank() {
  return {
    source_financial_account_id: null,
    destination_financial_account_id: null,
    amount_centavos: null,
    transfer_date: today(),
    status: 'effective',
    description: '',
    notes: '',
  }
}

watch(
  () => [props.modelValue, props.transfer],
  () => {
    if (!props.modelValue) return
    const initial = props.transfer
      ? {
          source_financial_account_id: props.transfer.source_financial_account.id,
          destination_financial_account_id: props.transfer.destination_financial_account.id,
          amount_centavos: props.transfer.amount_centavos,
          transfer_date: props.transfer.transfer_date,
          status: props.transfer.status,
          description: props.transfer.description ?? '',
          notes: props.transfer.notes ?? '',
        }
      : blank()

    Object.assign(form, initial)
    original.value = { ...initial }
  },
  { immediate: true },
)

function setPendingForFutureDate(date) {
  if (!props.transfer && date > today()) {
    form.status = 'pending'
  }
}

async function submit() {
  if (props.saving) return
  if (formRef.value?.validate) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  }
  if (sidesMustDiffer.value) return

  const payload = {
    source_financial_account_id: form.source_financial_account_id,
    destination_financial_account_id: form.destination_financial_account_id,
    amount_centavos: Number(form.amount_centavos),
    transfer_date: form.transfer_date,
    status: form.status ?? undefined,
    description: form.description === '' ? null : form.description,
    notes: form.notes === '' ? null : form.notes,
  }
  if (!props.transfer) {
    emit('submit', payload)

    return
  }

  const changes = Object.fromEntries(
    Object.entries(payload).filter(([key]) => form[key] !== original.value[key]),
  )
  if (Object.keys(changes).length > 0) emit('submit', changes)
}
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    :title="title"
    width="min(92vw, 640px)"
    :close-on-click-modal="!saving"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <ElForm
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      data-test="transfer-form"
      @submit.prevent="submit"
    >
      <div class="form-grid">
        <ElFormItem
          :label="t('transfers.source')"
          prop="source_financial_account_id"
          required
          :error="errors.source_financial_account_id?.[0]"
        >
          <ElSelect v-model="form.source_financial_account_id" data-test="transfer-source">
            <ElOption
              v-for="account in sourceOptions"
              :key="account.id"
              :label="sideLabel(account, t)"
              :value="account.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem
          :label="t('transfers.destination')"
          prop="destination_financial_account_id"
          required
          :error="errors.destination_financial_account_id?.[0]"
        >
          <ElSelect
            v-model="form.destination_financial_account_id"
            data-test="transfer-destination"
          >
            <ElOption
              v-for="account in destinationOptions"
              :key="account.id"
              :label="sideLabel(account, t)"
              :value="account.id"
            />
          </ElSelect>
        </ElFormItem>
      </div>
      <p v-if="sidesMustDiffer" class="hint hint-danger" data-test="transfer-sides-error">
        {{ t('transfers.sidesMustDiffer') }}
      </p>
      <div class="form-grid">
        <ElFormItem :label="t('transfers.amount')" :error="errors.amount_centavos?.[0]">
          <CurrencyAmountInput v-model="form.amount_centavos" data-test="transfer-amount" />
        </ElFormItem>
        <ElFormItem :label="t('transfers.date')" :error="errors.transfer_date?.[0]">
          <ElDatePicker
            v-model="form.transfer_date"
            type="date"
            value-format="YYYY-MM-DD"
            data-test="transfer-date"
            @change="setPendingForFutureDate"
          />
        </ElFormItem>
      </div>
      <ElFormItem :label="t('transfers.status')" :error="errors.status?.[0]">
        <ElRadioGroup v-model="form.status" data-test="transfer-status">
          <ElRadio v-for="status in statuses" :key="status.value" :value="status.value">
            {{ status.label }}
          </ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <p v-if="futureEffectiveNotice" class="hint" data-test="transfer-future-notice">
        {{ t('transfers.futureNotice') }}
      </p>
      <p v-if="pendingForFuture" class="hint" data-test="transfer-pending-notice">
        {{ t('transfers.pendingNoReservation') }}
      </p>
      <ElFormItem :label="t('transfers.descriptionField')" :error="errors.description?.[0]">
        <ElInput v-model="form.description" maxlength="200" data-test="transfer-description" />
      </ElFormItem>
      <ElFormItem :label="t('transfers.notes')" :error="errors.notes?.[0]">
        <ElInput v-model="form.notes" type="textarea" maxlength="1000" data-test="transfer-notes" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton
        :icon="Close"
        type="danger"
        :disabled="saving"
        data-test="cancel-transfer"
        @click="emit('update:modelValue', false)"
      >
        {{ t('transfers.cancel') }}
      </ElButton>
      <ElButton
        :icon="Check"
        type="primary"
        :loading="saving"
        :disabled="saving || (transfer && !hasChanges)"
        data-test="save-transfer"
        @click="submit"
      >
        {{ t('transfers.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.form-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hint {
  color: var(--color-text-muted, #666);
  font-size: 13px;
  line-height: 20px;
  margin: -8px 0 16px;
}

.hint-danger {
  color: var(--el-color-danger);
}

@media (max-width: 639px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
