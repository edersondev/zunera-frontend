<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  plan: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
  fieldErrors: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:modelValue', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const form = reactive({ categoryId: null, plannedAmountCentavos: null })

const isEditing = computed(() => props.plan !== null)
const title = computed(() => (isEditing.value ? t('budgets.form.editTitle') : t('budgets.form.createTitle')))
const categoryOptions = computed(() => {
  if (!props.plan) return props.categories

  const linked = {
    id: props.plan.category.id,
    name: props.plan.category.name,
    classification: 'expense',
    status: props.plan.category.status,
  }

  return props.categories.some((category) => category.id === linked.id)
    ? props.categories
    : [linked, ...props.categories]
})
const amount = computed(() =>
  Number.isInteger(form.plannedAmountCentavos) && form.plannedAmountCentavos > 0
    ? form.plannedAmountCentavos
    : null,
)
const submitDisabled = computed(() => props.submitting || !form.categoryId || amount.value === null)
const rules = computed(() => ({
  categoryId: [{ required: true, message: t('budgets.form.categoryRequired'), trigger: 'change' }],
  plannedAmountCentavos: [
    { required: true, message: t('budgets.form.amountRequired'), trigger: 'change' },
    {
      validator: (_rule, value, callback) => {
        if (Number.isInteger(value) && value > 0) {
          callback()
          return
        }

        callback(new Error(t('budgets.form.amountRange')))
      },
      trigger: 'change',
    },
  ],
}))

watch(
  () => [props.modelValue, props.plan],
  ([open]) => {
    if (open) {
      resetForm()
    } else {
      clearForm()
    }
  },
  { immediate: true },
)

function resetForm() {
  form.categoryId = props.plan?.category.id ?? null
  form.plannedAmountCentavos = props.plan?.planned.amount_centavos ?? null
  clearValidation()
}

function clearForm() {
  form.categoryId = null
  form.plannedAmountCentavos = null
  clearValidation()
}

function clearValidation() {
  const formComponent = formRef.value

  if (formComponent && typeof formComponent.clearValidate === 'function') {
    formComponent.clearValidate()
  }
}

async function submit() {
  if (props.submitting || submitDisabled.value) return

  const formComponent = formRef.value

  if (formComponent && typeof formComponent.validate === 'function') {
    const valid = await formComponent.validate().then(
      () => true,
      () => false,
    )

    if (!valid) return
  }

  emit('submit', {
    category_id: form.categoryId,
    planned_amount_centavos: form.plannedAmountCentavos,
  })
}
</script>

<template>
  <ElDialog
    :model-value="props.modelValue"
    :title="title"
    :close-on-click-modal="!props.submitting"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <ElFormItem
        :label="t('budgets.form.category')"
        prop="categoryId"
        :error="props.fieldErrors.category_id?.[0]"
      >
        <ElSelect
          v-model="form.categoryId"
          class="budget-form-control"
          :placeholder="t('budgets.form.categoryPlaceholder')"
          :disabled="isEditing"
          filterable
        >
          <ElOption
            v-for="category in categoryOptions"
            :key="category.id"
            :label="category.name"
            :value="category.id"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem
        :label="t('budgets.form.amount')"
        prop="plannedAmountCentavos"
        :error="props.fieldErrors.planned_amount_centavos?.[0]"
      >
        <CurrencyAmountInput
          v-model="form.plannedAmountCentavos"
          name="planned_amount_centavos"
        />
      </ElFormItem>
      <p class="budget-form-hint">{{ t('budgets.form.amountHelp') }}</p>
    </ElForm>

    <template #footer>
      <ElButton :disabled="props.submitting" @click="emit('update:modelValue', false)">
        {{ t('common.cancel') }}
      </ElButton>
      <ElButton
        data-test="budget-plan-submit"
        type="primary"
        :disabled="submitDisabled"
        :loading="props.submitting"
        @click="submit"
      >
        {{ isEditing ? t('budgets.form.save') : t('budgets.form.create') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.budget-form-control {
  inline-size: 100%;
}

.budget-form-hint {
  color: var(--el-text-color-secondary);
  font-size: 0.8125rem;
  margin: 0;
}
</style>
