<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  rule: { type: Object, required: true },
})
const emit = defineEmits(['edit', 'pause', 'resume', 'end'])
const { t } = useI18n()
</script>

<template>
  <div class="row-actions" data-test="recurrence-row-actions">
    <ElButton size="small" :aria-label="t('transactions.editAction')" data-test="recurrence-row-edit" @click="emit('edit', rule)">
      {{ t('transactions.editAction') }}
    </ElButton>
    <ElButton
      v-if="rule.state === 'active'"
      size="small"
      data-test="recurrence-row-pause"
      @click="emit('pause', rule)"
    >
      {{ t('recurringTransactions.pause') }}
    </ElButton>
    <ElButton
      v-if="rule.state === 'paused'"
      size="small"
      data-test="recurrence-row-resume"
      @click="emit('resume', rule)"
    >
      {{ t('recurringTransactions.resume') }}
    </ElButton>
    <ElButton
      v-if="rule.state !== 'ended'"
      size="small"
      data-test="recurrence-row-end"
      @click="emit('end', rule)"
    >
      {{ t('recurringTransactions.end') }}
    </ElButton>
  </div>
</template>
