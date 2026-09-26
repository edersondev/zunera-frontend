<script setup>
import { Check, Edit, FolderDelete, Minus, Plus, RefreshLeft } from '@element-plus/icons-vue'
import { ElButton } from 'element-plus'
import { useI18n } from 'vue-i18n'

const props = defineProps({ goal: { type: Object, required: true }, availableActions: { type: Array, required: true }, busy: { type: Boolean, default: false } })
const emit = defineEmits(['amount', 'edit', 'transition'])
const { t } = useI18n()
</script>

<template>
  <section class="goal-actions" :aria-label="t('goals.actions')">
    <h2>{{ t('goals.actions') }}</h2>
    <template v-if="props.goal.status === 'active'">
      <div class="action-row">
        <ElButton type="primary" :icon="Plus" :disabled="props.busy" data-test="allocate-goal" @click="emit('amount', 'allocate')">{{ t('goals.allocate') }}</ElButton>
        <ElButton :icon="Minus" :disabled="props.busy || !props.availableActions.includes('withdraw')" data-test="withdraw-goal" @click="emit('amount', 'withdraw')">{{ t('goals.withdraw') }}</ElButton>
        <ElButton :icon="Edit" :disabled="props.busy" @click="emit('edit')">{{ t('goals.edit') }}</ElButton>
      </div>
      <div class="lifecycle-actions">
        <p class="action-label">{{ t('goals.lifecycleActions') }}</p>
        <div class="action-row">
          <ElButton :icon="Check" :disabled="props.busy" data-test="complete-goal" @click="emit('transition', 'complete')">{{ t('goals.complete') }}</ElButton>
          <ElButton :icon="FolderDelete" :disabled="props.busy || !props.availableActions.includes('archive')" data-test="archive-goal" @click="emit('transition', 'archive')">{{ t('goals.archive') }}</ElButton>
        </div>
        <p v-if="!props.availableActions.includes('archive')" class="action-help">{{ t('goals.archiveHelp') }}</p>
      </div>
    </template>
    <div v-else class="action-row">
      <ElButton v-if="props.goal.status === 'completed'" :icon="RefreshLeft" :disabled="props.busy" @click="emit('transition', 'reopen')">{{ t('goals.reopen') }}</ElButton>
      <ElButton v-else :icon="RefreshLeft" :disabled="props.busy" @click="emit('transition', 'restore')">{{ t('goals.restore') }}</ElButton>
    </div>
  </section>
</template>

<style scoped>
.goal-actions { display: grid; gap: 16px; min-width: 0; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.goal-actions h2, .goal-actions p { margin: 0; }
.goal-actions h2 { font-size: 18px; line-height: 26px; color: var(--color-text); }
.action-row { display: flex; flex-wrap: wrap; gap: 8px; }
.action-row :deep(.el-button) { min-height: 44px; margin: 0; }
.lifecycle-actions { display: grid; gap: 10px; padding-top: 16px; border-top: 1px solid var(--color-border); }
.action-label { color: var(--color-text-muted); font-size: 13px; font-weight: 600; }
.action-help { color: var(--color-text-muted); font-size: 13px; }
@media (max-width: 639px) { .goal-actions { padding: 16px; } .action-row :deep(.el-button) { flex: 1 1 100%; } }
</style>
