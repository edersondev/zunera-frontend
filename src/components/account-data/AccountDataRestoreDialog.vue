<script setup>
import { Close, RefreshLeft } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  archive: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  error: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'closed'])
const { t } = useI18n()
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const errorText = computed(() => props.error?.code === 'archive_restore_unavailable'
  ? t('accountData.restoreUnavailable')
  : props.error?.message || t('accountData.restoreError'))

function submit() {
  if (!props.busy && props.archive) emit('confirm')
}
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="t('accountData.restoreTitle', { id: archive?.id })"
    width="min(92vw, 520px)"
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    @closed="emit('closed')"
  >
    <p>{{ t('accountData.restoreDescription', { count: archive?.record_count ?? 0 }) }}</p>
    <ElAlert class="restore-warning" type="warning" :title="t('accountData.restoreWarning')" :closable="false" show-icon />
    <ElAlert v-if="error" class="restore-error" type="error" :title="errorText" :closable="false" show-icon />
    <template #footer>
      <ElButton type="danger" :icon="Close" :disabled="busy" @click="visible = false">{{ t('common.cancel') }}</ElButton>
      <ElButton type="primary" :icon="RefreshLeft" :loading="busy" :disabled="busy || !archive" @click="submit">
        {{ t('accountData.restoreAction') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.restore-warning, .restore-error { margin-top: 16px; }
</style>
