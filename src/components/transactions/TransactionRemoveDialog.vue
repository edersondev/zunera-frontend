<script setup>
import { Close, Delete } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: { type: Boolean, required: true },
  transaction: { type: Object, default: null },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:visible', 'confirm'])
const { t } = useI18n()
</script>

<template>
  <ElDialog
    :model-value="props.visible"
    :title="t('transactions.removeTitle')"
    width="min(92vw, 480px)"
    :close-on-click-modal="!props.loading"
    @update:model-value="emit('update:visible', $event)"
  >
    <p class="dialog-description">{{ t('transactions.removeConfirmation', { description: props.transaction?.description }) }}</p>
    <template #footer>
      <ElButton
        :icon="Close"
        type="danger"
        :disabled="props.loading"
        data-test="cancel-remove"
        @click="emit('update:visible', false)"
      >
        {{ t('transactions.cancel') }}
      </ElButton>
      <ElButton
        :icon="Delete"
        type="info"
        :loading="props.loading"
        :disabled="props.loading"
        data-test="confirm-remove"
        @click="emit('confirm')"
      >
        {{ t('transactions.remove') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.dialog-description {
  color: var(--color-text);
  line-height: 24px;
  margin: 0;
}
</style>
