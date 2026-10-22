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
  ElInputNumber,
  ElCol,
  ElOption,
  ElRow,
  ElSelect,
} from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import InstallmentSchedule from '@/components/credit-cards/InstallmentSchedule.vue'
import { listCategories } from '@/services/categoryService'
import {
  availableCreditPresentation,
  businessToday,
  formatBRL,
  formatIsoDate,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  visible: { type: Boolean, default: false },
  card: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  mutationError: { type: Object, default: null },
  overLimit: { type: Object, default: null },
  createdPurchase: { type: Object, default: null },
  statementOptions: { type: Object, default: null },
  optionsLoading: { type: Boolean, default: false },
  optionsError: { type: Object, default: null },
})

const emit = defineEmits([
  'update:visible',
  'submit',
  'confirm-over-limit',
  'dismiss-over-limit',
  'dismiss-mutation-error',
  'request-statement-options',
])
const { t, locale } = useI18n()
const formRef = shallowRef(null)
const categories = shallowRef([])
const categoriesError = shallowRef(null)

const form = reactive({
  category_id: null,
  description: '',
  notes: '',
  purchase_date: businessToday(),
  total_amount_centavos: null,
  installment_count: 1,
  statement_closing_date: null,
})
const choiceError = shallowRef('')

const fieldErrors = computed(() => props.mutationError?.errors ?? {})
const errorMessage = computed(() =>
  props.mutationError && !Object.keys(fieldErrors.value).length ? props.mutationError.message : '',
)
const availableCredit = computed(() =>
  availableCreditPresentation(props.card?.summary?.available_credit?.amount_centavos ?? 0),
)
onMounted(loadCategories)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
      requestOptions()
    }
  },
)

watch(
  () => [form.purchase_date, props.card?.id],
  () => {
    form.statement_closing_date = null
    choiceError.value = ''
    if (props.visible) requestOptions()
  },
)

function requestOptions(fromMonth = null) {
  if (!props.card?.id || !form.purchase_date) return
  emit('request-statement-options', {
    cardId: props.card.id,
    purchaseDate: form.purchase_date,
    fromMonth,
  })
}

function statementOptionLabel(option) {
  return t('creditCards.statementChoice.option', {
    from: formatIsoDate(option.period_from, locale.value),
    to: formatIsoDate(option.period_to, locale.value),
    closing: formatIsoDate(option.closing_date, locale.value),
    due: formatIsoDate(option.due_date, locale.value),
  })
}

async function loadCategories() {
  try {
    const result = await listCategories()
    categories.value = result.filter(
      (category) => category.classification === 'expense' && category.status === 'active',
    )
  } catch (requestError) {
    categoriesError.value = requestError
  }
}

function resetForm() {
  form.category_id = null
  form.description = ''
  form.notes = ''
  form.purchase_date = businessToday()
  form.total_amount_centavos = null
  form.installment_count = 1
  form.statement_closing_date = null
  choiceError.value = ''
  formRef.value?.clearValidate?.()
}

function close() {
  formRef.value?.clearValidate?.()
  emit('dismiss-over-limit')
  emit('dismiss-mutation-error')
  emit('update:visible', false)
}

function submit() {
  if (props.statementOptions?.requires_statement_choice && !form.statement_closing_date) {
    choiceError.value = t('creditCards.statementChoice.required')
    return
  }
  choiceError.value = ''
  const payload = {
    category_id: form.category_id,
    description: form.description.trim(),
    notes: form.notes.trim() === '' ? null : form.notes.trim(),
    purchase_date: form.purchase_date,
    total_amount_centavos: form.total_amount_centavos,
    installment_count: form.installment_count,
  }
  if (props.statementOptions?.requires_statement_choice) {
    payload.statement_closing_date = form.statement_closing_date
  }
  emit('submit', payload)
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    :title="t('creditCards.purchase.title')"
    data-test="credit-card-purchase-dialog"
    @close="close"
  >
    <ElAlert
      v-if="errorMessage"
      type="error"
      :closable="false"
      :title="errorMessage"
      data-test="credit-card-purchase-error"
    />
    <ElAlert
      v-if="categoriesError"
      type="error"
      :closable="false"
      :title="categoriesError.message"
      data-test="credit-card-purchase-category-error"
    />

    <p class="purchase-form__availability" data-test="credit-card-purchase-available">
      {{ t('creditCards.purchase.availableCredit', { amount: availableCredit.formatted }) }}
    </p>

    <ElForm ref="formRef" label-position="top" @submit.prevent>
      <ElFormItem
        :label="t('creditCards.purchase.description')"
        :error="fieldErrors.description?.[0]"
      >
        <ElInput
          v-model="form.description"
          maxlength="200"
          data-test="credit-card-purchase-description"
        />
      </ElFormItem>

      <ElRow :gutter="16">
        <ElCol :xs="24" :md="12">
          <ElFormItem
            :label="t('creditCards.purchase.category')"
            :error="fieldErrors.category_id?.[0]"
          >
            <ElSelect v-model="form.category_id" data-test="credit-card-purchase-category">
              <ElOption
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>

        <ElCol :xs="24" :md="12">
          <ElFormItem
            :label="t('creditCards.purchase.amount')"
            :error="fieldErrors.total_amount_centavos?.[0]"
          >
            <CurrencyAmountInput
              v-model="form.total_amount_centavos"
              data-test="credit-card-purchase-amount"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElFormItem
        v-if="statementOptions?.requires_statement_choice"
        :label="t('creditCards.statementChoice.label')"
        :error="fieldErrors.statement_closing_date?.[0] || choiceError"
      >
        <ElSelect
          v-model="form.statement_closing_date"
          :placeholder="t('creditCards.statementChoice.placeholder')"
          :disabled="optionsLoading"
          data-test="credit-card-purchase-statement"
          @change="choiceError = ''"
        >
          <ElOption
            v-for="option in statementOptions.options"
            :key="option.closing_date"
            :label="statementOptionLabel(option)"
            :value="option.closing_date"
          />
        </ElSelect>
        <p v-if="statementOptions.options.length === 0" data-test="credit-card-purchase-options-empty">
          {{ t('creditCards.statementChoice.empty') }}
        </p>
        <ElButton
          v-if="statementOptions.next_from_month"
          text
          data-test="credit-card-purchase-options-more"
          @click="requestOptions(statementOptions.next_from_month)"
        >{{ t('creditCards.statementChoice.more') }}</ElButton>
      </ElFormItem>
      <p v-if="fieldErrors.statement_closing_date?.length" role="alert" data-test="credit-card-purchase-choice-stale">
        {{ t('creditCards.statementChoice.stale') }}
      </p>
      <p v-if="optionsLoading" role="status" data-test="credit-card-purchase-options-loading">
        {{ t('creditCards.statementChoice.loading') }}
      </p>
      <ElAlert
        v-if="optionsError"
        type="error"
        :closable="false"
        :title="optionsError.message || t('creditCards.statementChoice.loadError')"
        data-test="credit-card-purchase-options-error"
      />
      <ElButton v-if="optionsError" text data-test="credit-card-purchase-options-retry" @click="requestOptions()">
        {{ t('creditCards.statementChoice.retry') }}
      </ElButton>

      <ElRow :gutter="16">
        <ElCol :xs="24" :md="12">
          <ElFormItem
            :label="t('creditCards.purchase.date')"
            :error="fieldErrors.purchase_date?.[0]"
          >
            <ElDatePicker
              v-model="form.purchase_date"
              value-format="YYYY-MM-DD"
              data-test="credit-card-purchase-date"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :xs="24" :md="12">
          <ElFormItem
            :label="t('creditCards.purchase.installments')"
            :error="fieldErrors.installment_count?.[0]"
          >
            <ElInputNumber
              v-model="form.installment_count"
              :min="1"
              :max="360"
              data-test="credit-card-purchase-installments"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElFormItem :label="t('creditCards.purchase.notes')" :error="fieldErrors.notes?.[0]">
        <ElInput
          v-model="form.notes"
          type="textarea"
          maxlength="1000"
          data-test="credit-card-purchase-notes"
        />
      </ElFormItem>
    </ElForm>

    <ElAlert
      v-if="overLimit"
      type="warning"
      :closable="false"
      class="purchase-form__over-limit"
      data-test="credit-card-purchase-over-limit"
      :title="t('creditCards.purchase.overLimitTitle')"
    >
      <p>
        {{
          t('creditCards.purchase.overLimitBody', {
            amount: formatBRL(overLimit.resultingCentavos),
          })
        }}
      </p>
      <ElButton
        type="danger"
        :icon="Check"
        :loading="submitting"
        data-test="credit-card-purchase-confirm-over-limit"
        @click="emit('confirm-over-limit')"
      >
        {{ t('creditCards.purchase.confirmOverLimit') }}
      </ElButton>
      <ElButton
        text
        type="danger"
        :icon="Close"
        data-test="credit-card-purchase-dismiss-over-limit"
        @click="emit('dismiss-over-limit')"
      >
        {{ t('common.cancel') }}
      </ElButton>
    </ElAlert>

    <section
      v-if="createdPurchase"
      class="purchase-form__result"
      data-test="credit-card-purchase-result"
    >
      <h3>{{ t('creditCards.purchase.schedule') }}</h3>
      <InstallmentSchedule :installments="createdPurchase.installments" />
    </section>

    <template #footer>
      <ElButton
        :icon="Close"
        type="danger"
        data-test="credit-card-purchase-cancel"
        @click="close"
        >{{ t('common.cancel') }}</ElButton
      >
      <ElButton
        type="primary"
        :icon="Check"
        :loading="submitting"
        :disabled="optionsLoading || Boolean(optionsError)"
        data-test="credit-card-purchase-submit"
        @click="submit"
      >
        {{ t('common.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.purchase-form__availability {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}

.purchase-form__over-limit,
.purchase-form__result {
  margin-top: 1rem;
}

.purchase-form__result h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
}
</style>
