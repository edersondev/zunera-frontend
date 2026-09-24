<script setup>
import { computed } from 'vue'
import { CircleCheck, Clock, Delete, Edit, MoreFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  transaction: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  inline: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'update-status', 'remove'])
const { t } = useI18n()

const nextStatus = computed(() =>
  props.transaction.status === 'effective' ? 'pending' : 'effective',
)
const nextStatusIcon = computed(() => (nextStatus.value === 'effective' ? CircleCheck : Clock))

function handleCommand(command) {
  if (props.saving) return

  if (command === 'edit') emit('edit', props.transaction)
  if (command === 'status') emit('update-status', props.transaction, nextStatus.value)
  if (command === 'remove') emit('remove', props.transaction)
}
</script>

<template>
  <div v-if="inline" class="inline-actions" data-test="transaction-inline-actions" @click.stop>
    <ElButton
      size="small"
      type="info"
      :icon="Edit"
      :disabled="saving"
      data-test="transaction-action-edit"
      @click.stop="handleCommand('edit')"
    >
      {{ t('transactions.editAction') }}
    </ElButton>
    <ElButton
      size="small"
      :type="nextStatus === 'pending' ? 'warning' : 'success'"
      :icon="nextStatusIcon"
      :disabled="saving"
      data-test="transaction-action-status"
      @click.stop="handleCommand('status')"
    >
      {{ t(`transactions.${nextStatus}`) }}
    </ElButton>
    <ElButton
      size="small"
      type="danger"
      plain
      :icon="Delete"
      :disabled="saving"
      data-test="transaction-action-remove"
      @click.stop="handleCommand('remove')"
    >
      {{ t('transactions.remove') }}
    </ElButton>
  </div>
  <ElDropdown v-else trigger="click" @command="handleCommand">
    <ElButton
      circle
      type="info"
      :icon="MoreFilled"
      :disabled="props.saving"
      :aria-label="t('transactions.actions')"
      data-test="transaction-row-actions"
      @click.stop
    />
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem command="edit" :disabled="props.saving" data-test="transaction-action-edit">
          <ElIcon><Edit /></ElIcon>
          <span>{{ t('transactions.editAction') }}</span>
        </ElDropdownItem>
        <ElDropdownItem
          command="status"
          :disabled="props.saving"
          data-test="transaction-action-status"
        >
          <ElIcon><component :is="nextStatusIcon" /></ElIcon>
          <span>{{ t(`transactions.${nextStatus}`) }}</span>
        </ElDropdownItem>
        <ElDropdownItem
          command="remove"
          :disabled="props.saving"
          divided
          class="transaction-remove-action"
          data-test="transaction-action-remove"
        >
          <ElIcon><Delete /></ElIcon>
          <span>{{ t('transactions.remove') }}</span>
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
  display: flex;
  gap: 8px;
  align-items: center;
}

:deep(.transaction-remove-action),
:deep(.transaction-remove-action:not(.is-disabled):hover),
:deep(.transaction-remove-action:not(.is-disabled):focus) {
  color: var(--el-color-danger);
}
</style>
