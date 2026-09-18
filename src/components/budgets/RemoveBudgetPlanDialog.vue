<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  plan: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm'])
const { t } = useI18n()
const categoryName = computed(() => props.plan?.category.name ?? '')
</script>

<template>
  <ElDialog
    :model-value="props.modelValue"
    :title="t('budgets.remove.title')"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p>{{ t('budgets.remove.confirmation', { name: categoryName }) }}</p>
    <p class="budget-remove-note">{{ t('budgets.remove.note') }}</p>

    <template #footer>
      <ElButton :disabled="props.submitting" @click="emit('update:modelValue', false)">
        {{ t('common.cancel') }}
      </ElButton>
      <ElButton type="danger" :loading="props.submitting" @click="emit('confirm', props.plan)">
        {{ t('budgets.remove.confirm') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.budget-remove-note {
  color: var(--el-text-color-secondary);
  font-size: 0.875rem;
}
</style>
