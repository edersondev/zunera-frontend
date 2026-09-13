<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'

const props = defineProps({
  modelValue: Boolean,
  transaction: { type: Object, default: null },
  accounts: { type: Array, required: true },
  categories: { type: Array, required: true },
  saving: Boolean,
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const form = reactive(blank())
const title = computed(() => (props.transaction ? t('transactions.edit') : t('transactions.new')))
const rules = computed(() => ({
  financial_account_id: [
    { required: true, message: t('transactions.accountRequired'), trigger: 'change' },
  ],
  category_id: [
    { required: true, message: t('transactions.categoryRequired'), trigger: 'change' },
  ],
}))

/**
 * Archived associations stay selectable while the association is unchanged so
 * historical transactions keep working. They are labelled as archived and are
 * never offered as a new association for another transaction.
 */
function withArchived(source, current) {
  const choices = source.map((choice) => ({ ...choice, archived: choice.status === 'archived' }))
  if (current && !choices.some((choice) => choice.id === current.id)) {
    choices.push({ ...current, archived: true })
  }

  return choices
}

const accountChoices = computed(() => withArchived(props.accounts, props.transaction?.financial_account))
const categoryChoices = computed(() =>
  withArchived(
    props.categories.filter((category) => category.classification === form.type),
    props.transaction?.category,
  ),
)

function blank() {
  return {
    financial_account_id: null,
    category_id: null,
    type: 'expense',
    status: 'effective',
    description: '',
    notes: '',
    amount_centavos: null,
    transaction_date: new Date().toISOString().slice(0, 10),
  }
}

watch(
  () => [props.modelValue, props.transaction],
  () => {
    if (!props.modelValue) return
    Object.assign(
      form,
      props.transaction
        ? {
            ...props.transaction,
            financial_account_id: props.transaction.financial_account.id,
            category_id: props.transaction.category.id,
            status: props.transaction.status,
            transaction_date: props.transaction.transaction_date,
          }
        : blank(),
    )
  },
  { immediate: true },
)

async function submit() {
  if (props.saving) return
  if (formRef.value?.validate) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  }

  const payload = { ...form, amount_centavos: Number(form.amount_centavos) }
  if (payload.status === null || payload.status === undefined) {
    delete payload.status
  }
  for (const key of ['id', 'removed_at', 'created_at', 'updated_at', 'currency_code', 'search_text', 'financial_account', 'category']) {
    delete payload[key]
  }
  emit('submit', payload)
}

function setPendingForFutureDate(date) {
  if (!props.transaction && date > new Date().toISOString().slice(0, 10)) {
    form.status = 'pending'
  }
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
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" data-test="transaction-form" @submit.prevent="submit">
      <div class="form-grid">
        <ElFormItem :label="t('transactions.type')" :error="errors.type?.[0]">
          <ElRadioGroup v-model="form.type" data-test="transaction-type">
            <ElRadio value="expense">{{ t('transactions.expense') }}</ElRadio>
            <ElRadio value="income">{{ t('transactions.income') }}</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem :label="t('transactions.status')" :error="errors.status?.[0]">
          <ElRadioGroup v-model="form.status" data-test="transaction-status">
            <ElRadio value="effective">{{ t('transactions.effective') }}</ElRadio>
            <ElRadio value="pending">{{ t('transactions.pending') }}</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </div>
      <ElFormItem :label="t('transactions.descriptionField')" :error="errors.description?.[0]">
        <ElInput v-model="form.description" maxlength="200" data-test="transaction-description" />
      </ElFormItem>
      <div class="form-grid">
        <ElFormItem :label="t('transactions.amountCentavos')" :error="errors.amount_centavos?.[0]">
          <CurrencyAmountInput v-model="form.amount_centavos" data-test="transaction-amount" />
        </ElFormItem>
        <ElFormItem :label="t('transactions.date')" :error="errors.transaction_date?.[0]">
          <ElDatePicker
            v-model="form.transaction_date"
            type="date"
            value-format="YYYY-MM-DD"
            data-test="transaction-date"
            @change="setPendingForFutureDate"
          />
        </ElFormItem>
      </div>
      <div class="form-grid">
        <ElFormItem
          :label="t('transactions.account')"
          prop="financial_account_id"
          required
          :error="errors.financial_account_id?.[0]"
        >
          <ElSelect v-model="form.financial_account_id" data-test="transaction-account">
            <ElOption
              v-for="account in accountChoices"
              :key="account.id"
              :label="account.archived ? `${account.name} (${t('transactions.archived')})` : account.name"
              :value="account.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem
          :label="t('transactions.category')"
          prop="category_id"
          required
          :error="errors.category_id?.[0]"
        >
          <ElSelect v-model="form.category_id" data-test="transaction-category">
            <ElOption
              v-for="category in categoryChoices"
              :key="category.id"
              :label="category.archived ? `${category.name} (${t('transactions.archived')})` : category.name"
              :value="category.id"
            />
          </ElSelect>
        </ElFormItem>
      </div>
      <ElFormItem :label="t('transactions.notes')">
        <ElInput v-model="form.notes" type="textarea" maxlength="1000" data-test="transaction-notes" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton
        :icon="Close"
        type="danger"
        :disabled="saving"
        data-test="cancel-transaction"
        @click="emit('update:modelValue', false)"
      >
        {{ t('transactions.cancel') }}
      </ElButton>
      <ElButton
        :icon="Check"
        type="primary"
        :loading="saving"
        :disabled="saving"
        data-test="save-transaction"
        @click="submit"
      >
        {{ t('transactions.save') }}
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
@media (max-width: 639px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
