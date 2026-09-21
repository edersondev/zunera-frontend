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
  ElOption,
  ElSelect,
} from 'element-plus'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import { listCategories } from '@/services/categoryService'

const props = defineProps({
  visible: { type: Boolean, default: false },
  purchase: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  mutationError: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const categories = shallowRef([])

const form = reactive({
  category_id: null,
  description: '',
  purchase_date: '',
  total_amount_centavos: null,
  installment_count: 1,
})

const fieldErrors = computed(() => props.mutationError?.errors ?? {})
const errorMessage = computed(() =>
  props.mutationError && !Object.keys(fieldErrors.value).length ? props.mutationError.message : '',
)

onMounted(async () => {
  try {
    const result = await listCategories()
    categories.value = result.filter(
      (category) => category.classification === 'expense' && category.status === 'active',
    )
  } catch {
    // The select stays empty; the alert below reports the failure.
  }
})

watch(
  () => [props.visible, props.purchase],
  ([visible]) => {
    if (!visible || !props.purchase) return
    form.category_id = props.purchase.category?.id ?? null
    form.description = props.purchase.description ?? ''
    form.purchase_date = props.purchase.purchase_date ?? ''
    form.total_amount_centavos = props.purchase.total_amount?.amount_centavos ?? null
    form.installment_count = props.purchase.installment_count ?? 1
    formRef.value?.clearValidate?.()
  },
  { immediate: true },
)

function submit() {
  emit('submit', {
    category_id: form.category_id,
    description: form.description.trim(),
    purchase_date: form.purchase_date,
    total_amount_centavos: form.total_amount_centavos,
    installment_count: form.installment_count,
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
    :title="t('creditCards.correction.title')"
    data-test="credit-card-correction-dialog"
    @close="close"
  >
    <ElAlert
      v-if="errorMessage"
      type="error"
      :closable="false"
      :title="errorMessage"
      data-test="credit-card-correction-error"
    />

    <ElForm ref="formRef" label-position="top" @submit.prevent>
      <ElFormItem
        :label="t('creditCards.correction.category')"
        :error="fieldErrors.category_id?.[0]"
      >
        <ElSelect v-model="form.category_id" data-test="credit-card-correction-category">
          <ElOption
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem
        :label="t('creditCards.correction.description')"
        :error="fieldErrors.description?.[0]"
      >
        <ElInput
          v-model="form.description"
          maxlength="200"
          data-test="credit-card-correction-description"
        />
      </ElFormItem>

      <ElFormItem
        :label="t('creditCards.correction.amount')"
        :error="fieldErrors.total_amount_centavos?.[0]"
      >
        <CurrencyAmountInput
          v-model="form.total_amount_centavos"
          data-test="credit-card-correction-amount"
        />
      </ElFormItem>

      <ElFormItem :label="t('creditCards.correction.date')" :error="fieldErrors.purchase_date?.[0]">
        <ElDatePicker
          v-model="form.purchase_date"
          value-format="YYYY-MM-DD"
          data-test="credit-card-correction-date"
        />
      </ElFormItem>

      <ElFormItem
        :label="t('creditCards.correction.installments')"
        :error="fieldErrors.installment_count?.[0]"
      >
        <ElInputNumber
          v-model="form.installment_count"
          :min="1"
          :max="360"
          data-test="credit-card-correction-installments"
        />
      </ElFormItem>
    </ElForm>

    <p class="correction__hint">{{ t('creditCards.correction.hint') }}</p>

    <template #footer>
      <ElButton type="danger" data-test="credit-card-correction-cancel" @click="close">{{
        t('common.cancel')
      }}</ElButton>
      <ElButton
        type="primary"
        :loading="submitting"
        data-test="credit-card-correction-submit"
        @click="submit"
      >
        {{ t('common.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.correction__hint {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}
</style>
