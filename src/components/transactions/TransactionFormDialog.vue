<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  transaction: { type: Object, default: null },
  accounts: { type: Array, required: true },
  categories: { type: Array, required: true },
  saving: Boolean,
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'submit'])
const form = reactive(blank())
const title = computed(() => (props.transaction ? 'Editar transação' : 'Nova transação'))

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
    status: null,
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

function submit() {
  if (props.saving) return
  const payload = { ...form, amount_centavos: Number(form.amount_centavos) }
  if (payload.status === null || payload.status === undefined) {
    delete payload.status
  }
  for (const key of ['id', 'removed_at', 'created_at', 'updated_at', 'currency_code', 'search_text', 'financial_account', 'category']) {
    delete payload[key]
  }
  emit('submit', payload)
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
    <ElForm :model="form" label-position="top" data-test="transaction-form" @submit.prevent="submit">
      <div class="form-grid">
        <ElFormItem label="Tipo" :error="errors.type?.[0]">
          <ElSelect v-model="form.type" data-test="transaction-type">
            <ElOption label="Despesa" value="expense" />
            <ElOption label="Receita" value="income" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Status" :error="errors.status?.[0]">
          <ElSelect v-model="form.status" clearable data-test="transaction-status">
            <ElOption label="Efetiva" value="effective" />
            <ElOption label="Pendente" value="pending" />
          </ElSelect>
        </ElFormItem>
      </div>
      <ElFormItem label="Descrição" :error="errors.description?.[0]">
        <ElInput v-model="form.description" maxlength="200" data-test="transaction-description" />
      </ElFormItem>
      <div class="form-grid">
        <ElFormItem label="Valor (centavos)" :error="errors.amount_centavos?.[0]">
          <ElInputNumber v-model="form.amount_centavos" :min="1" :precision="0" data-test="transaction-amount" />
        </ElFormItem>
        <ElFormItem label="Data" :error="errors.transaction_date?.[0]">
          <ElDatePicker v-model="form.transaction_date" type="date" value-format="YYYY-MM-DD" data-test="transaction-date" />
        </ElFormItem>
      </div>
      <div class="form-grid">
        <ElFormItem label="Conta" :error="errors.financial_account_id?.[0]">
          <ElSelect v-model="form.financial_account_id" data-test="transaction-account">
            <ElOption
              v-for="account in accountChoices"
              :key="account.id"
              :label="account.archived ? `${account.name} (arquivada)` : account.name"
              :value="account.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Categoria" :error="errors.category_id?.[0]">
          <ElSelect v-model="form.category_id" data-test="transaction-category">
            <ElOption
              v-for="category in categoryChoices"
              :key="category.id"
              :label="category.archived ? `${category.name} (arquivada)` : category.name"
              :value="category.id"
            />
          </ElSelect>
        </ElFormItem>
      </div>
      <ElFormItem label="Observação">
        <ElInput v-model="form.notes" type="textarea" maxlength="1000" data-test="transaction-notes" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="saving" @click="emit('update:modelValue', false)">Cancelar</ElButton>
      <ElButton type="primary" :loading="saving" :disabled="saving" data-test="save-transaction" @click="submit">
        Salvar
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
