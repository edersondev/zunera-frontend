<script setup>
import { reactive, shallowRef, watch } from 'vue'
import {
  CATEGORY_CLASSIFICATIONS,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from '@/utils/categories/categoryOptions'

const props = defineProps({
  category: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  formId: { type: String, default: undefined },
  showSubmit: { type: Boolean, default: true },
})
const emit = defineEmits(['submit'])
const formRef = shallowRef(null)
const form = reactive({ name: '', classification: 'expense', color: 'teal', icon: 'circle' })
const rules = {
  name: [
    { required: true, message: 'Enter a category name.', trigger: 'blur' },
    {
      min: 1,
      max: 120,
      message: 'Category name must be between 1 and 120 characters.',
      trigger: 'blur',
    },
  ],
  classification: [{ required: true, message: 'Choose income or expense.', trigger: 'change' }],
}

watch(
  () => props.category,
  (category) => {
    form.name = category?.name ?? ''
    form.classification = category?.classification ?? 'expense'
    form.color = category?.color ?? 'teal'
    form.icon = category?.icon ?? 'circle'
  },
  { immediate: true },
)

function resetCreateForm() {
  form.name = ''
  form.classification = 'expense'
  form.color = 'teal'
  form.icon = 'circle'
}
async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  emit('submit', {
    name: form.name.trim(),
    classification: form.classification,
    color: form.color,
    icon: form.icon,
  })
}
defineExpose({ resetCreateForm })
</script>

<template>
  <ElForm
    :id="props.formId"
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    @submit.prevent="submit"
  >
    <div class="form-row">
      <ElFormItem label="Category name" prop="name"
        ><ElInput
          v-model="form.name"
          name="category-name"
          autocomplete="off"
          placeholder="Pet care"
      /></ElFormItem>
      <ElFormItem label="Financial classification" prop="classification">
        <ElSelect
          v-model="form.classification"
          name="category-classification"
          aria-label="Financial classification"
          :disabled="Boolean(props.category?.has_financial_transactions)"
        >
          <ElOption
            v-for="item in CATEGORY_CLASSIFICATIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
        <p v-if="props.category?.has_financial_transactions" class="field-help">
          Classification is locked because this category has financial history.
        </p>
      </ElFormItem>
    </div>
    <div class="form-row">
      <ElFormItem label="Color (optional)"
        ><ElSelect v-model="form.color" name="category-color" aria-label="Category color"
          ><ElOption
            v-for="item in CATEGORY_COLORS"
            :key="item.value"
            :label="item.label"
            :value="item.value" /></ElSelect
      ></ElFormItem>
      <ElFormItem label="Icon (optional)"
        ><ElSelect v-model="form.icon" name="category-icon" aria-label="Category icon"
          ><ElOption
            v-for="item in CATEGORY_ICONS"
            :key="item.value"
            :label="item.label"
            :value="item.value" /></ElSelect
      ></ElFormItem>
    </div>
    <ElButton
      v-if="props.showSubmit"
      native-type="submit"
      type="primary"
      :loading="props.submitting"
      >{{ props.category ? 'Save changes' : 'Create category' }}</ElButton
    >
  </ElForm>
</template>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.field-help {
  width: 100%;
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
