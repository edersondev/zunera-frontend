<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import {
  destinationSideOptions,
  sideLabel,
  sourceSideOptions,
} from '@/utils/transfers/transferOptions'

const props = defineProps({
  modelValue: Boolean,
  transaction: { type: Object, default: null },
  transfer: { type: Object, default: null },
  initialType: { type: String, default: 'expense' },
  accounts: { type: Array, required: true },
  categories: { type: Array, required: true },
  saving: Boolean,
  errors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const form = reactive(blank())
const isEditing = computed(() => Boolean(props.transaction || props.transfer))
const title = computed(() => (isEditing.value ? t('transactions.edit') : t('transactions.new')))
const isTransfer = computed(() => form.type === 'transfer')
const rules = computed(() => ((isTransfer.value
    ? {
        source_financial_account_id: [
          { required: true, message: t('transfers.sourceRequired'), trigger: 'change' },
        ],
        destination_financial_account_id: [
          { required: true, message: t('transfers.destinationRequired'), trigger: 'change' },
        ],
      }
    : {
        financial_account_id: [
          { required: true, message: t('transactions.accountRequired'), trigger: 'change' },
        ],
        category_id: [
          { required: true, message: t('transactions.categoryRequired'), trigger: 'change' },
        ],
      })))

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
const sourceChoices = computed(() => sourceSideOptions(props.accounts, props.transfer))
const destinationChoices = computed(() =>
  destinationSideOptions(props.accounts, props.transfer, form.source_financial_account_id),
)
const sidesMustDiffer = computed(
  () =>
    form.source_financial_account_id !== null &&
    form.source_financial_account_id === form.destination_financial_account_id,
)

function blank() {
  return {
    financial_account_id: null,
    category_id: null,
    source_financial_account_id: null,
    destination_financial_account_id: null,
    type: props.initialType,
    status: 'effective',
    description: '',
    notes: '',
    amount_centavos: null,
    transaction_date: new Date().toISOString().slice(0, 10),
  }
}

function clearValidation() {
  formRef.value?.clearValidate?.()
}

watch(
  () => [props.modelValue, props.transaction, props.transfer, props.initialType],
  () => {
    if (!props.modelValue) {
      Object.assign(form, blank())

      return
    }

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
        : props.transfer
          ? {
              ...blank(),
              type: 'transfer',
              source_financial_account_id: props.transfer.source_financial_account.id,
              destination_financial_account_id: props.transfer.destination_financial_account.id,
              amount_centavos: props.transfer.amount_centavos,
              transaction_date: props.transfer.transfer_date,
              status: props.transfer.status,
              description: props.transfer.description ?? '',
              notes: props.transfer.notes ?? '',
            }
          : blank(),
    )
  },
  { immediate: true },
)

function onTypeChange() {
  if (isTransfer.value) return

  const category = categoryChoices.value.find((choice) => choice.id === form.category_id)
  if (!category) form.category_id = null
}

async function submit() {
  if (props.saving) return
  if (formRef.value?.validate) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return
  }

  if (isTransfer.value) {
    if (sidesMustDiffer.value) return

    emit('submit', {
      kind: 'transfer',
      payload: {
        source_financial_account_id: form.source_financial_account_id,
        destination_financial_account_id: form.destination_financial_account_id,
        amount_centavos: Number(form.amount_centavos),
        transfer_date: form.transaction_date,
        status: form.status ?? undefined,
        description: form.description === '' ? null : form.description,
        notes: form.notes === '' ? null : form.notes,
      },
    })

    return
  }

  const payload = { ...form, amount_centavos: Number(form.amount_centavos) }
  if (payload.status === null || payload.status === undefined) delete payload.status
  for (const key of ['id', 'removed_at', 'created_at', 'updated_at', 'currency_code', 'search_text', 'financial_account', 'category']) {
    delete payload[key]
  }
  delete payload.source_financial_account_id
  delete payload.destination_financial_account_id
  emit('submit', { kind: 'transaction', payload })
}

function setPendingForFutureDate(date) {
  if (!props.transaction && !props.transfer && date > new Date().toISOString().slice(0, 10)) {
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
    @closed="clearValidation"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" data-test="transaction-form" @submit.prevent="submit">
      <div class="form-grid">
        <ElFormItem :label="t('transactions.type')" :error="errors.type?.[0]">
          <ElRadioGroup
            v-model="form.type"
            :disabled="isEditing"
            data-test="transaction-type"
            @change="onTypeChange"
          >
            <ElRadio value="expense">{{ t('transactions.expense') }}</ElRadio>
            <ElRadio value="income">{{ t('transactions.income') }}</ElRadio>
            <ElRadio value="transfer">{{ t('transactions.transfer') }}</ElRadio>
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
      <div v-if="!isTransfer" class="form-grid">
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
      <div v-if="isTransfer" class="form-grid">
        <ElFormItem
          :label="t('transfers.source')"
          prop="source_financial_account_id"
          required
          :error="errors.source_financial_account_id?.[0]"
        >
          <ElSelect v-model="form.source_financial_account_id" data-test="transaction-transfer-source">
            <ElOption
              v-for="account in sourceChoices"
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
          <ElSelect v-model="form.destination_financial_account_id" data-test="transaction-transfer-destination">
            <ElOption
              v-for="account in destinationChoices"
              :key="account.id"
              :label="sideLabel(account, t)"
              :value="account.id"
            />
          </ElSelect>
        </ElFormItem>
      </div>
      <p
        v-if="isTransfer && sidesMustDiffer"
        class="hint hint-danger"
        data-test="transaction-transfer-sides-error"
      >
        {{ t('transfers.sidesMustDiffer') }}
      </p>
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
