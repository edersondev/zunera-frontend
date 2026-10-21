<script setup>
import { nextTick, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElDialog } from 'element-plus'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: { type: Boolean, default: false },
  purchase: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  mutationError: { type: Object, default: null },
})
const emit = defineEmits(['update:visible', 'confirm'])
const { t } = useI18n()
let returnFocus = null
let returnPurchaseId = null

watch(() => props.visible, async (visible) => {
  if (visible) {
    returnFocus = document.activeElement
    returnPurchaseId = props.purchase?.id
  }
  else if (returnFocus?.focus) {
    await nextTick()
    restoreFocus()
  }
})

function restoreFocus() {
  const fallback = document.querySelector(`[data-test="credit-card-purchase-actions-${returnPurchaseId}"]`)
  const target = fallback ?? (returnFocus?.isConnected ? returnFocus : null)
  target?.focus()
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    :title="t('creditCards.delete.title')"
    data-test="credit-card-purchase-delete-dialog"
    @close="emit('update:visible', false)"
    @closed="restoreFocus"
  >
    <p v-if="purchase" data-test="credit-card-delete-warning">
      {{ t('creditCards.delete.warning', { name: purchase.description, count: purchase.installment_count }) }}
    </p>
    <ElAlert
      v-if="mutationError"
      type="error"
      :closable="false"
      :title="mutationError.code === 'PURCHASE_HAS_LINKED_CREDITS'
        ? t('creditCards.delete.linkedCredits')
        : mutationError.message || t('creditCards.delete.error')"
      data-test="credit-card-delete-error"
    />
    <template #footer>
      <ElButton type="danger" :icon="Close" data-test="credit-card-delete-cancel" @click="emit('update:visible', false)">
        {{ t('common.cancel') }}
      </ElButton>
      <ElButton
        type="primary"
        :icon="Check"
        :loading="submitting"
        :disabled="!purchase || submitting"
        data-test="credit-card-delete-confirm"
        @click="emit('confirm')"
      >{{ t('creditCards.delete.confirm') }}</ElButton>
    </template>
  </ElDialog>
</template>
