<script setup>
import { computed, shallowRef, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElDialog, ElForm, ElFormItem } from 'element-plus'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'

const props = defineProps({ action: { type: String, required: true }, busy: { type: Boolean, default: false }, error: { type: Object, default: null } })
const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['submit'])
const { t } = useI18n()
const amount = shallowRef(null)
const localError = shallowRef('')
const title = computed(() => t(props.action === 'allocate' ? 'goals.allocate' : 'goals.withdraw'))
watch(visible, (open) => { if (open) { amount.value = null; localError.value = '' } })
function submit() {
  if (!Number.isInteger(amount.value) || amount.value <= 0) { localError.value = t('goals.amountRequired'); return }
  localError.value = ''
  emit('submit', amount.value)
}
</script>

<template>
  <ElDialog v-model="visible" :title="title" width="min(92vw, 440px)" :close-on-click-modal="false">
    <ElForm label-position="top" @submit.prevent="submit">
      <ElFormItem :label="t('goals.amount')" :error="localError || props.error?.errors?.amount_centavos?.[0]">
        <CurrencyAmountInput v-model="amount" name="amount_centavos" :disabled="props.busy" />
      </ElFormItem>
      <ElAlert v-if="props.error?.message" :title="props.error.message" type="error" :closable="false" show-icon />
      <p class="amount-note">{{ t(props.action === 'allocate' ? 'goals.allocateHelp' : 'goals.withdrawHelp') }}</p>
      <div class="dialog-actions">
        <ElButton type="danger" :icon="Close" :disabled="props.busy" @click="visible = false">{{ t('common.cancel') }}</ElButton>
        <ElButton type="primary" native-type="submit" :loading="props.busy">{{ title }}</ElButton>
      </div>
    </ElForm>
  </ElDialog>
</template>

<style scoped>
.amount-note { margin: 0 0 16px; color: var(--color-text-muted); }
.dialog-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
</style>
