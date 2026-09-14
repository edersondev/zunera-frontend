<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  accountLabel,
  formatTransferAmount,
  formatTransferDate,
  formatTransferStatus,
} from '@/utils/transfers/transferFormatters'

const props = defineProps({ modelValue: Boolean, transfer: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'edit', 'remove'])
const { t } = useI18n()
const title = computed(() =>
  props.transfer?.description ? props.transfer.description : t('transfers.transfer'),
)
</script>

<template>
  <ElDrawer
    :model-value="modelValue"
    :title="title"
    size="min(92vw, 480px)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <ElDescriptions v-if="transfer" :column="1" border data-test="transfer-detail">
      <ElDescriptionsItem :label="t('transfers.amount')">
        {{ formatTransferAmount(transfer) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transfers.date')">
        {{ formatTransferDate(transfer.transfer_date) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transfers.source')">
        {{ accountLabel(transfer.source_financial_account, t) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transfers.destination')">
        {{ accountLabel(transfer.destination_financial_account, t) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transfers.status')">
        {{ formatTransferStatus(transfer.status, t) }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transfers.descriptionField')">
        {{ transfer.description || t('transfers.noNotes') }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="t('transfers.notes')">
        {{ transfer.notes || t('transfers.noNotes') }}
      </ElDescriptionsItem>
    </ElDescriptions>
    <template #footer>
      <ElButton data-test="edit-transfer" @click="emit('edit', transfer)">
        {{ t('transfers.edit') }}
      </ElButton>
      <ElButton type="danger" data-test="remove-transfer" @click="emit('remove', transfer)">
        {{ t('transfers.remove') }}
      </ElButton>
    </template>
  </ElDrawer>
</template>
