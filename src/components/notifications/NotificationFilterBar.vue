<script setup>
import { useI18n } from 'vue-i18n'

defineProps({ view: { type: String, required: true } })
const emit = defineEmits(['change'])
const { t } = useI18n()
</script>

<template>
  <div class="notification-filters">
    <ElRadioGroup :model-value="view" :aria-label="t('notifications.filterLabel')" @change="emit('change', $event)">
      <ElRadioButton value="all">{{ t('notifications.all') }}</ElRadioButton>
      <ElRadioButton value="unread">{{ t('notifications.unread') }}</ElRadioButton>
      <ElRadioButton value="requires_action">{{ t('notifications.requiresAction') }}</ElRadioButton>
    </ElRadioGroup>
  </div>
</template>

<style scoped>
.notification-filters { min-width: 0; }
.notification-filters :deep(.el-radio-group) { display: flex; flex-wrap: wrap; gap: 4px; }
.notification-filters :deep(.el-radio-button__inner) { min-height: 40px; display: inline-flex; align-items: center; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--color-text-subtle); box-shadow: none; }
.notification-filters :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background: var(--color-action-primary-subtle); color: var(--color-action-primary); box-shadow: none; }
.notification-filters :deep(.el-radio-button__inner:hover) { color: var(--color-action-primary); }
@media (max-width: 639px) { .notification-filters :deep(.el-radio-button__inner) { padding-inline: 10px; font-size: 12px; } }
</style>
