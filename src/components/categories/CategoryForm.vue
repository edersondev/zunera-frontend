<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import {
  categoryClassificationOptions,
  categoryColorOptions,
  categoryIconOptions,
} from '@/utils/categories/categoryOptions'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  category: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  formId: { type: String, default: undefined },
  showSubmit: { type: Boolean, default: true },
})
const emit = defineEmits(['submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const form = reactive({ name: '', classification: 'expense', color: 'teal', icon: 'circle' })
const classificationOptions = computed(() => categoryClassificationOptions(t))
const colorOptions = computed(() => categoryColorOptions(t))
const iconOptions = computed(() => categoryIconOptions(t))
const rules = computed(() => ({
  name: [
    { required: true, message: t('categories.nameRequired'), trigger: 'blur' },
    {
      min: 1,
      max: 120,
      message: t('categories.nameLength'),
      trigger: 'blur',
    },
  ],
  classification: [{ required: true, message: t('categories.classificationRequired'), trigger: 'change' }],
}))

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
      <ElFormItem :label="t('categories.name')" prop="name"
        ><ElInput
          v-model="form.name"
          name="category-name"
          autocomplete="off"
          :placeholder="t('categories.name')"
      /></ElFormItem>
      <ElFormItem :label="t('categories.classification')" prop="classification">
        <ElSelect
          v-model="form.classification"
          name="category-classification"
          :aria-label="t('categories.classification')"
          :disabled="Boolean(props.category?.has_financial_transactions)"
        >
          <ElOption
            v-for="item in classificationOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </ElSelect>
        <p v-if="props.category?.has_financial_transactions" class="field-help">
          {{ t('categories.classificationLocked') }}
        </p>
      </ElFormItem>
    </div>
    <div class="form-row">
      <ElFormItem :label="t('categories.color')"
        ><ElSelect v-model="form.color" name="category-color" :aria-label="t('categories.color')"
          ><ElOption
            v-for="item in colorOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value" /></ElSelect
      ></ElFormItem>
      <ElFormItem :label="t('categories.icon')"
        ><ElSelect v-model="form.icon" name="category-icon" :aria-label="t('categories.icon')"
          ><ElOption
            v-for="item in iconOptions"
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
      >{{ props.category ? t('categories.saveChanges') : t('categories.create') }}</ElButton
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
