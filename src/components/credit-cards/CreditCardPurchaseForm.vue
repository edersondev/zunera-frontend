<script setup>
import { computed, onMounted, reactive, shallowRef, watch } from 'vue'
import { ElAlert, ElButton, ElDatePicker, ElDialog, ElForm, ElFormItem, ElInput, ElInputNumber, ElOption, ElSelect } from 'element-plus'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import InstallmentSchedule from '@/components/credit-cards/InstallmentSchedule.vue'
import { listCategories } from '@/services/categoryService'
import { availableCreditPresentation, businessToday, formatBRL } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  visible: { type: Boolean, default: false },
  card: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  mutationError: { type: Object, default: null },
  overLimit: { type: Object, default: null },
  createdPurchase: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit', 'confirm-over-limit', 'dismiss-over-limit'])
const { t } = useI18n()
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
})

const fieldErrors = computed(() => props.mutationError?.errors ?? {})
const errorMessage = computed(() =>
  props.mutationError && !Object.keys(fieldErrors.value).length ? props.mutationError.message : '',
)
const availableCredit = computed(() =>
  availableCreditPresentation(props.card?.summary?.available_credit?.amount_centavos ?? 0),
)
const installmentCountSuffix = computed(() => (form.installment_count > 1 ? 'x' : ''))

onMounted(loadCategories)

watch(
  () => props.visible,
  (visible) => {
    if (visible) resetForm()
  },
)

async function loadCategories() {
  try {
    const result = await listCategories()
    categories.value = result.filter((category) => category.classification === 'expense' && category.status === 'active')
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
  formRef.value?.clearValidate?.()
}

function close() {
  formRef.value?.clearValidate?.()
  emit('update:visible', false)
}

function submit() {
  emit('submit', {
    category_id: form.category_id,
    description: form.description.trim(),
    notes: form.notes.trim() === '' ? null : form.notes.trim(),
    purchase_date: form.purchase_date,
    total_amount_centavos: form.total_amount_centavos,
    installment_count: form.installment_count,
  })
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    :title="t('creditCards.purchase.title')"
    data-test="credit-card-purchase-dialog"
    @close="close"
  >
    <ElAlert v-if="errorMessage" type="error" :closable="false" :title="errorMessage" data-test="credit-card-purchase-error" />
    <ElAlert v-if="categoriesError" type="error" :closable="false" :title="categoriesError.message" data-test="credit-card-purchase-category-error" />

    <p class="purchase-form__availability" data-test="credit-card-purchase-available">
      {{ t('creditCards.purchase.availableCredit', { amount: availableCredit.formatted }) }}
    </p>

    <ElForm ref="formRef" label-position="top" @submit.prevent>
      <ElFormItem :label="t('creditCards.purchase.category')" :error="fieldErrors.category_id?.[0]">
        <ElSelect v-model="form.category_id" data-test="credit-card-purchase-category">
          <ElOption
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem :label="t('creditCards.purchase.description')" :error="fieldErrors.description?.[0]">
        <ElInput v-model="form.description" maxlength="200" data-test="credit-card-purchase-description" />
      </ElFormItem>

      <ElFormItem :label="t('creditCards.purchase.amount')" :error="fieldErrors.total_amount_centavos?.[0]">
        <CurrencyAmountInput v-model="form.total_amount_centavos" data-test="credit-card-purchase-amount" />
      </ElFormItem>

      <ElFormItem :label="t('creditCards.purchase.date')" :error="fieldErrors.purchase_date?.[0]">
        <ElDatePicker v-model="form.purchase_date" value-format="YYYY-MM-DD" data-test="credit-card-purchase-date" />
      </ElFormItem>

      <ElFormItem :label="t('creditCards.purchase.installments')" :error="fieldErrors.installment_count?.[0]">
        <ElInputNumber v-model="form.installment_count" :min="1" :max="360" data-test="credit-card-purchase-installments" />
        <span class="purchase-form__hint" data-test="credit-card-purchase-installment-hint">
          {{ t('creditCards.purchase.installmentHint', { count: form.installment_count, suffix: installmentCountSuffix }) }}
        </span>
      </ElFormItem>

      <ElFormItem :label="t('creditCards.purchase.notes')" :error="fieldErrors.notes?.[0]">
        <ElInput v-model="form.notes" type="textarea" maxlength="1000" data-test="credit-card-purchase-notes" />
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
        {{ t('creditCards.purchase.overLimitBody', {
          amount: formatBRL(overLimit.resultingCentavos),
        }) }}
      </p>
      <ElButton type="danger" :loading="submitting" data-test="credit-card-purchase-confirm-over-limit" @click="emit('confirm-over-limit')">
        {{ t('creditCards.purchase.confirmOverLimit') }}
      </ElButton>
      <ElButton text data-test="credit-card-purchase-dismiss-over-limit" @click="emit('dismiss-over-limit')">
        {{ t('common.cancel') }}
      </ElButton>
    </ElAlert>

    <section v-if="createdPurchase" class="purchase-form__result" data-test="credit-card-purchase-result">
      <h3>{{ t('creditCards.purchase.schedule') }}</h3>
      <InstallmentSchedule :installments="createdPurchase.installments" />
    </section>

    <template #footer>
      <ElButton data-test="credit-card-purchase-cancel" @click="close">{{ t('common.cancel') }}</ElButton>
      <ElButton type="primary" :loading="submitting" data-test="credit-card-purchase-submit" @click="submit">
        {{ t('common.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.purchase-form__availability,
.purchase-form__hint {
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
