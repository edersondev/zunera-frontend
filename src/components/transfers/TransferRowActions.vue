<script setup>
import { computed } from 'vue'
import { CircleCheck, Clock, Delete, Edit, MoreFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  transfer: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  inline: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'update-status', 'remove'])
const { t } = useI18n()
const nextStatus = computed(() => (props.transfer.status === 'effective' ? 'pending' : 'effective'))
const nextStatusIcon = computed(() => (nextStatus.value === 'effective' ? CircleCheck : Clock))

function handleCommand(command) {
  if (props.saving) return

  if (command === 'edit') emit('edit', props.transfer)
  if (command === 'status') emit('update-status', props.transfer, nextStatus.value)
  if (command === 'remove') emit('remove', props.transfer)
}
</script>

<template>
  <div v-if="inline" class="inline-actions" data-test="transfer-inline-actions" @click.stop>
    <ElButton
      size="small"
      :icon="Edit"
      :disabled="saving"
      data-test="transfer-action-edit"
      @click.stop="handleCommand('edit')"
    >
      {{ t('transfers.editAction') }}
    </ElButton>
    <ElButton
      size="small"
      :icon="nextStatusIcon"
      :disabled="saving"
      data-test="transfer-action-status"
      @click.stop="handleCommand('status')"
    >
      {{ t(`transfers.${nextStatus}`) }}
    </ElButton>
    <ElButton
      size="small"
      type="danger"
      plain
      :icon="Delete"
      :disabled="saving"
      data-test="transfer-action-remove"
      @click.stop="handleCommand('remove')"
    >
      {{ t('transfers.remove') }}
    </ElButton>
  </div>
  <ElDropdown v-else trigger="click" @command="handleCommand">
    <ElButton
      circle
      type="info"
      :icon="MoreFilled"
      :disabled="saving"
      :aria-label="t('transfers.actions')"
      data-test="transfer-row-actions"
      @click.stop
    />
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem command="edit" :disabled="saving" data-test="transfer-action-edit">
          <ElIcon><Edit /></ElIcon>
          <span>{{ t('transfers.editAction') }}</span>
        </ElDropdownItem>
        <ElDropdownItem command="status" :disabled="saving" data-test="transfer-action-status">
          <ElIcon><component :is="nextStatusIcon" /></ElIcon>
          <span>{{ t(`transfers.${nextStatus}`) }}</span>
        </ElDropdownItem>
        <ElDropdownItem
          command="remove"
          divided
          :disabled="saving"
          class="transfer-remove-action"
          data-test="transfer-action-remove"
        >
          <ElIcon><Delete /></ElIcon>
          <span>{{ t('transfers.remove') }}</span>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<style scoped>
.inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.inline-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.el-dropdown-menu__item {
  align-items: center;
  display: flex;
  gap: 8px;
}

:deep(.transfer-remove-action),
:deep(.transfer-remove-action:not(.is-disabled):hover),
:deep(.transfer-remove-action:not(.is-disabled):focus) {
  color: var(--el-color-danger);
}
</style>
