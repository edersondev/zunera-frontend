<script setup>
import { CircleClose, Edit, MoreFilled, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  rule: { type: Object, required: true },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'pause', 'resume', 'end'])
const { t } = useI18n()

function handleCommand(command) {
  if (props.saving) return

  if (command === 'edit') emit('edit', props.rule)
  if (command === 'pause') emit('pause', props.rule)
  if (command === 'resume') emit('resume', props.rule)
  if (command === 'end') emit('end', props.rule)
}
</script>

<template>
  <ElDropdown trigger="click" @command="handleCommand">
    <ElButton
      circle
      type="info"
      :icon="MoreFilled"
      :disabled="props.saving"
      :aria-label="t('transactions.actions')"
      data-test="recurrence-row-actions"
      @click.stop
    />
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem command="edit" :disabled="props.saving" data-test="recurrence-action-edit">
          <ElIcon><Edit /></ElIcon>
          <span>{{ t('transactions.editAction') }}</span>
        </ElDropdownItem>
        <ElDropdownItem
          v-if="rule.state === 'active'"
          command="pause"
          :disabled="props.saving"
          data-test="recurrence-action-pause"
        >
          <ElIcon><VideoPause /></ElIcon>
          <span>{{ t('recurringTransactions.pause') }}</span>
        </ElDropdownItem>
        <ElDropdownItem
          v-if="rule.state === 'paused'"
          command="resume"
          :disabled="props.saving"
          data-test="recurrence-action-resume"
        >
          <ElIcon><VideoPlay /></ElIcon>
          <span>{{ t('recurringTransactions.resume') }}</span>
        </ElDropdownItem>
        <ElDropdownItem
          v-if="rule.state !== 'ended'"
          command="end"
          :disabled="props.saving"
          divided
          class="recurrence-end-action"
          data-test="recurrence-action-end"
        >
          <ElIcon><CircleClose /></ElIcon>
          <span>{{ t('recurringTransactions.end') }}</span>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<style scoped>
.el-dropdown-menu__item {
  display: flex;
  gap: 8px;
  align-items: center;
}

:deep(.recurrence-end-action),
:deep(.recurrence-end-action:not(.is-disabled):hover),
:deep(.recurrence-end-action:not(.is-disabled):focus) {
  color: var(--el-color-danger);
}
</style>
