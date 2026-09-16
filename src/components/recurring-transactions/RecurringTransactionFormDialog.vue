<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import { frequencyLabel, frequencyOptions } from '@/utils/recurring-transactions/recurringTransactionFormatters'

const props = defineProps({
  modelValue: Boolean,
  rule: { type: Object, default: null },
  accounts: { type: Array, required: true },
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
const categoryOptions = computed(() =>
  props.categories.filter(
    (category) => category.status === 'active' && category.classification === form.type,
  ),
)
const rules = computed(() => ({
  financial_account_id: [
    { required: true, message: t('recurringTransactions.accountRequired'), trigger: 'change' },
  ],
  category_id: [
    { required: true, message: t('recurringTransactions.categoryRequired'), trigger: 'change' },
  ],
}))

function blank() {
  return {
    type: 'expense',
    financial_account_id: null,
    category_id: null,
    amount_centavos: null,
    frequency: 'monthly',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    description: '',
    notes: '',
  }
}

watch(
  () => [props.modelValue, props.rule],
  () => {
    if (!props.modelValue) {
      formRef.value?.clearValidate?.()

      return
    }
    const initial = props.rule
      ? {
          type: props.rule.type,
          financial_account_id: props.rule.financial_account?.id ?? null,
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
  },
  { immediate: true },
)

function onTypeChange() {
  const match = categoryOptions.value.find((category) => category.id === form.category_id)
  if (!match) form.category_id = null
}

async function submit() {
  if (props.saving) return
  if (formRef.value?.validate) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  }

  const payload = {
    financial_account_id: form.financial_account_id,
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
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" data-test="recurrence-form" @submit.prevent="submit">
      <ElFormItem :label="t('recurringTransactions.criteria.type')">
        <ElRadioGroup v-model="form.type" data-test="recurrence-type" @change="onTypeChange">
          <ElRadio value="expense">{{ t('transactions.expense') }}</ElRadio>
          <ElRadio value="income">{{ t('transactions.income') }}</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <div class="form-grid">
        <ElFormItem :label="t('recurringTransactions.account')" prop="financial_account_id" required :error="errors.financial_account_id?.[0]">
          <ElSelect v-model="form.financial_account_id" data-test="recurrence-account">
            <ElOption v-for="account in activeAccounts" :key="account.id" :label="account.name" :value="account.id" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('recurringTransactions.category')" prop="category_id" required :error="errors.category_id?.[0]">
          <ElSelect v-model="form.category_id" data-test="recurrence-category">
            <ElOption v-for="category in categoryOptions" :key="category.id" :label="category.name" :value="category.id" />
          </ElSelect>
        </ElFormItem>
      </div>
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
      <ElFormItem :label="t('recurringTransactions.descriptionField')" :error="errors.description?.[0]">
        <ElInput v-model="form.description" maxlength="200" data-test="recurrence-description" />
      </ElFormItem>
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
