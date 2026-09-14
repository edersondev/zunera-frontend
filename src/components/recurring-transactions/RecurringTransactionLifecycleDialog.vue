<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: Boolean,
  action: { type: String, default: 'pause' },
  rule: { type: Object, default: null },
  saving: Boolean,
  error: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'confirm'])
const { t } = useI18n()
const descriptions = computed(() => ({
  pause: t('recurringTransactions.pauseConfirmation', { description: props.rule?.description ?? '' }),
  resume: t('recurringTransactions.resumeConfirmation', { description: props.rule?.description ?? '' }),
  end: t('recurringTransactions.endConfirmation', { description: props.rule?.description ?? '' }),
}))
const titles = computed(() => ({
  pause: t('recurringTransactions.pauseTitle'),
  resume: t('recurringTransactions.resumeTitle'),
  end: t('recurringTransactions.endTitle'),
}))
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    :title="titles[action]"
    width="min(92vw, 480px)"
    :close-on-click-modal="!saving"
    data-test="recurrence-lifecycle-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p data-test="recurrence-lifecycle-description">{{ descriptions[action] }}</p>
    <p v-if="rule?.paused_reason === 'association_archived'" class="hint" data-test="recurrence-lifecycle-repair">
      {{ t('recurringTransactions.repairAssociation') }}
    </p>
    <ElAlert v-if="error" type="error" :closable="false" show-icon :title="error" data-test="recurrence-lifecycle-error" />
    <template #footer>
      <ElButton data-test="recurrence-lifecycle-cancel" @click="emit('update:modelValue', false)">
        {{ t('common.cancel') }}
      </ElButton>
      <ElButton type="primary" :loading="saving" data-test="recurrence-lifecycle-confirm" @click="emit('confirm')">
        {{ action === 'resume' ? t('recurringTransactions.resume') : action === 'end' ? t('recurringTransactions.end') : t('recurringTransactions.pause') }}
      </ElButton>
    </template>
  </ElDialog>
</template>
