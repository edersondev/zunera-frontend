<script setup>
import { computed } from 'vue'
import { CircleCheck, Close, Delete } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatTransferRoute } from '@/utils/transfers/transferFormatters'

const props = defineProps({
  visible: { type: Boolean, required: true },
  transfer: { type: Object, default: null },
  action: { type: String, default: 'remove' },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:visible', 'confirm'])
const { t } = useI18n()
const isRestore = computed(() => props.action === 'restore')
const title = computed(() => (isRestore.value ? t('transfers.restoreTitle') : t('transfers.removeTitle')))
const description = computed(() =>
  isRestore.value
    ? t('transfers.restoreConfirmation', { route: formatTransferRoute(props.transfer, t) })
    : t('transfers.removeConfirmation', { route: formatTransferRoute(props.transfer, t) }),
)
</script>

<template>
  <ElDialog
    :model-value="props.visible"
    :title="title"
    width="min(92vw, 480px)"
    :close-on-click-modal="!props.loading"
    @update:model-value="emit('update:visible', $event)"
  >
    <p class="dialog-description" data-test="transfer-lifecycle-description">{{ description }}</p>
    <template #footer>
      <ElButton
        :icon="Close"
        type="danger"
        :disabled="props.loading"
        data-test="cancel-lifecycle"
        @click="emit('update:visible', false)"
      >
        {{ t('transfers.cancel') }}
      </ElButton>
      <ElButton
        :icon="isRestore ? CircleCheck : Delete"
        type="info"
        :loading="props.loading"
        :disabled="props.loading"
        data-test="confirm-lifecycle"
        @click="emit('confirm')"
      >
        {{ isRestore ? t('transfers.restore') : t('transfers.remove') }}
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
