<script setup>
import { computed, nextTick, reactive, shallowRef, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import { cardIdentityLabel } from '@/utils/credit-cards/creditCardFormatters'
import { frequencyLabel, frequencyOptions } from '@/utils/recurring-transactions/recurringTransactionFormatters'

const props = defineProps({
  modelValue: Boolean,
  rule: { type: Object, default: null },
  accounts: { type: Array, required: true },
  cards: { type: Array, default: () => [] },
  categories: { type: Array, required: true },
  saving: Boolean,
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const form = reactive(blank())
const original = shallowRef(blank())
const title = computed(() =>
  props.rule ? t('recurringTransactions.editDialog') : t('recurringTransactions.newDialog'),
)
const activeAccounts = computed(() => props.accounts.filter((account) => account.status === 'active'))
const activeCards = computed(() => props.cards.filter((card) => card.status === 'active'))
const categoryOptions = computed(() =>
  props.categories.filter(
    (category) => category.status === 'active' && category.classification === form.type,
  ),
)
const rules = computed(() => ({
  financial_account_id: [
    {
      required: form.destination_type === 'financial_account',
      message: t('recurringTransactions.accountRequired'),
      trigger: 'change',
    },
  ],
  credit_card_id: [
    {
      required: form.destination_type === 'credit_card',
      message: t('recurringTransactions.cardRequired'),
      trigger: 'change',
    },
  ],
  category_id: [
    { required: true, message: t('recurringTransactions.categoryRequired'), trigger: 'change' },
  ],
}))

function blank() {
  return {
    type: 'expense',
    destination_type: 'financial_account',
    financial_account_id: null,
    credit_card_id: null,
    generation_mode: 'automatic',
    category_id: null,
    amount_centavos: null,
    frequency: 'monthly',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    description: '',
    notes: '',
  }
}

function clearValidation() {
  formRef.value?.clearValidate?.()
}

watch(
  () => [props.modelValue, props.rule],
  async () => {
    if (!props.modelValue) return
    const initial = props.rule
      ? {
          type: props.rule.type,
          destination_type: props.rule.destination_type ?? 'financial_account',
          financial_account_id: props.rule.financial_account?.id ?? null,
          credit_card_id: props.rule.credit_card?.id ?? null,
          generation_mode: props.rule.generation_mode ?? 'automatic',
          category_id: props.rule.category?.id ?? null,
          amount_centavos: props.rule.amount_centavos,
          frequency: props.rule.frequency,
          start_date: props.rule.start_date,
          end_date: props.rule.end_date,
          description: props.rule.description ?? '',
          notes: props.rule.notes ?? '',
        }
      : blank()

    Object.assign(form, initial)
    original.value = { ...initial }

    await nextTick()
    clearValidation()
  },
  { immediate: true },
)

function onTypeChange() {
  const match = categoryOptions.value.find((category) => category.id === form.category_id)
  if (!match) form.category_id = null
}

function onDestinationChange() {
  if (form.destination_type === 'credit_card') form.financial_account_id = null
  else form.credit_card_id = null
}

async function submit() {
  if (props.saving) return
  if (formRef.value?.validate) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  }

  const payload = {
    destination_type: form.destination_type,
    financial_account_id: form.destination_type === 'financial_account' ? form.financial_account_id : undefined,
    credit_card_id: form.destination_type === 'credit_card' ? form.credit_card_id : undefined,
    generation_mode: form.destination_type === 'credit_card' ? form.generation_mode : undefined,
    category_id: form.category_id,
    type: form.type,
    amount_centavos: Number(form.amount_centavos),
    frequency: form.frequency,
    start_date: form.start_date,
    end_date: form.end_date || null,
    description: form.description,
    notes: form.notes === '' ? null : form.notes,
  }

  if (!props.rule) {
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
    @closed="clearValidation"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" data-test="recurrence-form" @submit.prevent="submit">
      <div class="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
        <ElFormItem :label="t('recurringTransactions.criteria.type')">
          <ElRadioGroup v-model="form.type" data-test="recurrence-type" @change="onTypeChange">
            <ElRadio value="expense">{{ t('transactions.expense') }}</ElRadio>
            <ElRadio value="income">{{ t('transactions.income') }}</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem :label="t('recurringTransactions.destination')">
          <ElRadioGroup v-model="form.destination_type" data-test="recurrence-destination-field" :disabled="Boolean(rule)" @change="onDestinationChange">
            <ElRadio value="financial_account">{{ t('recurringTransactions.destinationOptions.financial_account') }}</ElRadio>
            <ElRadio value="credit_card">{{ t('recurringTransactions.destinationOptions.credit_card') }}</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </div>
      <ElFormItem :label="t('recurringTransactions.descriptionField')" :error="errors.description?.[0]">
        <ElInput v-model="form.description" maxlength="200" data-test="recurrence-description" />
      </ElFormItem>
      <div class="form-grid">
        <ElFormItem v-if="form.destination_type === 'financial_account'" :label="t('recurringTransactions.account')" prop="financial_account_id" required :error="errors.financial_account_id?.[0]">
          <ElSelect v-model="form.financial_account_id" data-test="recurrence-account">
            <ElOption v-for="account in activeAccounts" :key="account.id" :label="account.name" :value="account.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-else :label="t('recurringTransactions.creditCard')" prop="credit_card_id" required :error="errors.credit_card_id?.[0]">
          <ElSelect v-model="form.credit_card_id" data-test="recurrence-card">
            <ElOption v-for="card in activeCards" :key="card.id" :label="cardIdentityLabel(card)" :value="card.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('recurringTransactions.category')" prop="category_id" required :error="errors.category_id?.[0]">
          <ElSelect v-model="form.category_id" data-test="recurrence-category">
            <ElOption v-for="category in categoryOptions" :key="category.id" :label="category.name" :value="category.id" />
          </ElSelect>
        </ElFormItem>
      </div>
      <ElFormItem v-if="form.destination_type === 'credit_card'" :label="t('recurringTransactions.generationMode')">
        <ElRadioGroup v-model="form.generation_mode" data-test="recurrence-generation-mode">
          <ElRadio value="automatic">{{ t('recurringTransactions.generationModeOptions.automatic') }}</ElRadio>
          <ElRadio value="confirmation">{{ t('recurringTransactions.generationModeOptions.confirmation') }}</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <div class="form-grid">
        <ElFormItem :label="t('recurringTransactions.amount')" :error="errors.amount_centavos?.[0]">
          <CurrencyAmountInput v-model="form.amount_centavos" data-test="recurrence-amount" />
        </ElFormItem>
        <ElFormItem :label="t('recurringTransactions.frequency')" :error="errors.frequency?.[0]">
          <ElSelect v-model="form.frequency" data-test="recurrence-frequency">
            <ElOption
              v-for="option in frequencyOptions(t)"
              :key="option.value"
              :label="frequencyLabel(option.value, t)"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>
      </div>
      <div class="form-grid">
        <ElFormItem :label="t('recurringTransactions.startDate')" :error="errors.start_date?.[0]">
          <ElDatePicker v-model="form.start_date" type="date" value-format="YYYY-MM-DD" data-test="recurrence-start" />
        </ElFormItem>
        <ElFormItem :label="t('recurringTransactions.endDate')" :error="errors.end_date?.[0]">
          <ElDatePicker v-model="form.end_date" type="date" value-format="YYYY-MM-DD" clearable data-test="recurrence-end" />
        </ElFormItem>
      </div>
      <ElFormItem :label="t('recurringTransactions.notes')" :error="errors.notes?.[0]">
        <ElInput v-model="form.notes" type="textarea" maxlength="1000" data-test="recurrence-notes" />
      </ElFormItem>
      <div class="dialog-actions">
        <ElButton
          :icon="Close"
          type="danger"
          :disabled="saving"
          data-test="recurrence-cancel"
          @click="emit('update:modelValue', false)"
        >
          {{ t('common.cancel') }}
        </ElButton>
        <ElButton
          :icon="Check"
          type="primary"
          :loading="saving"
          :disabled="saving"
          data-test="recurrence-save"
          @click="submit"
        >
          {{ t('common.save') }}
        </ElButton>
      </div>
    </ElForm>
  </ElDialog>
</template>

<style scoped>
.form-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 639px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .dialog-actions {
    justify-content: stretch;
  }

  .dialog-actions :deep(.el-button) {
    flex: 1;
  }
}
</style>
