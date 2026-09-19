<script setup>
import { computed } from 'vue'
import { DocumentCopy, Plus } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  state: { type: String, default: 'no-budget' },
  canCopy: { type: Boolean, default: false },
})
const emit = defineEmits(['create', 'copy', 'add'])
const { t } = useI18n()

const title = computed(() => t(`budgets.empty.${props.state}.title`))
const description = computed(() => t(`budgets.empty.${props.state}.description`))
</script>

<template>
  <section class="budget-empty" aria-live="polite">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <div class="budget-empty-actions">
      <ElButton
        v-if="props.state === 'no-budget'"
        data-test="budget-empty-create"
        type="primary"
        :icon="Plus"
        @click="emit('create')"
      >
        {{ t('budgets.empty.create') }}
      </ElButton>
      <ElButton
        v-if="props.state === 'no-budget' && props.canCopy"
        data-test="budget-empty-copy"
        :icon="DocumentCopy"
        @click="emit('copy')"
      >
        {{ t('budgets.empty.copy') }}
      </ElButton>
      <ElButton
        v-if="props.state === 'no-plans'"
        data-test="budget-empty-add"
        type="primary"
        :icon="Plus"
        @click="emit('add')"
      >
        {{ t('budgets.empty.add') }}
      </ElButton>
    </div>
  </section>
</template>

<style scoped>
.budget-empty {
  border: 1px dashed var(--el-border-color);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.budget-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
</style>
