<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { Close, DocumentCopy } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatBudgetMonth, shiftMonth } from '@/utils/budgets/budgetFormatters'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sourceMonth: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
  error: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'copy'])
const { t, locale } = useI18n()
const formRef = shallowRef(null)
const destination = reactive({ year: props.sourceMonth.year, month: props.sourceMonth.month })
const yearOptions = computed(() => {
  const years = []
  const start = Number(props.sourceMonth.year) - 2

  for (let year = start; year < start + 6; year += 1) years.push(year)

  return years
})
const sameMonth = computed(
  () =>
    Number(destination.year) === Number(props.sourceMonth.year) &&
    Number(destination.month) === Number(props.sourceMonth.month),
)
const preview = computed(() => formatBudgetMonth(destination.year, destination.month, locale.value))
const rules = computed(() => ({
  year: [{ required: true, message: t('budgets.copy.yearRequired'), trigger: 'change' }],
  month: [{ required: true, message: t('budgets.copy.monthRequired'), trigger: 'change' }],
}))

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return

    const nextMonth = shiftMonth(props.sourceMonth, 1)
    destination.year = nextMonth.year
    destination.month = nextMonth.month
  },
  { immediate: true },
)

async function submit() {
  if (props.submitting || sameMonth.value) return

  const formComponent = formRef.value

  if (formComponent && typeof formComponent.validate === 'function') {
    const valid = await formComponent.validate().then(
      () => true,
      () => false,
    )

    if (!valid) return
  }

  emit('copy', { year: Number(destination.year), month: Number(destination.month) })
}
</script>

<template>
  <ElDialog
    :model-value="props.modelValue"
    :title="t('budgets.copy.title')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p>{{ t('budgets.copy.description') }}</p>
    <ElForm ref="formRef" :model="destination" :rules="rules" label-position="top">
      <ElFormItem :label="t('budgets.copy.destinationYear')" prop="year">
        <ElSelect v-model="destination.year" class="budget-copy-control">
          <ElOption v-for="year in yearOptions" :key="year" :label="String(year)" :value="year" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem :label="t('budgets.copy.destinationMonth')" prop="month">
        <ElSelect v-model="destination.month" class="budget-copy-control">
          <ElOption v-for="month in 12" :key="month" :label="month" :value="month" />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <p class="budget-copy-preview">{{ preview }}</p>
    <ElAlert
      v-if="props.error"
      type="error"
      :closable="false"
      show-icon
      :title="props.error.message ?? t('budgets.copy.failed')"
    />
    <p v-if="sameMonth" class="budget-copy-same">{{ t('budgets.copy.sameMonth') }}</p>

    <template #footer>
      <ElButton
        type="danger"
        :icon="Close"
        :disabled="props.submitting"
        @click="emit('update:modelValue', false)"
      >
        {{ t('common.cancel') }}
      </ElButton>
      <ElButton
        data-test="budget-copy-confirm"
        type="primary"
        :icon="DocumentCopy"
        :disabled="props.submitting || sameMonth"
        :loading="props.submitting"
        @click="submit"
      >
        {{ t('budgets.copy.confirm') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.budget-copy-control {
  inline-size: 100%;
}

.budget-copy-preview {
  font-weight: 600;
  text-transform: capitalize;
}

.budget-copy-same {
  color: var(--el-color-danger);
}
</style>
