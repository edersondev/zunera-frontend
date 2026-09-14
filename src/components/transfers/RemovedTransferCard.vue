<script setup>
import { RefreshLeft } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import {
  accountLabel,
  formatTransferAmount,
  formatTransferDate,
} from '@/utils/transfers/transferFormatters'

const props = defineProps({
  transfer: { type: Object, required: true },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['restore'])
const { t } = useI18n()
</script>

<template>
  <article class="transfer-card" data-test="removed-transfer-card">
    <div class="transfer-card-heading">
      <div>
        <h3 class="transfer-label">{{ t('transfers.transfer') }}</h3>
        <p v-if="props.transfer.description" class="transfer-description">{{ props.transfer.description }}</p>
      </div>
      <p class="transfer-amount">{{ formatTransferAmount(props.transfer) }}</p>
    </div>
    <dl class="transfer-details">
      <div>
        <dt>{{ t('transfers.columns.date') }}</dt>
        <dd>{{ formatTransferDate(props.transfer.transfer_date) }}</dd>
      </div>
      <div>
        <dt>{{ t('transfers.columns.source') }}</dt>
        <dd>{{ accountLabel(props.transfer.source_financial_account, t) }}</dd>
      </div>
      <div>
        <dt>{{ t('transfers.columns.destination') }}</dt>
        <dd>{{ accountLabel(props.transfer.destination_financial_account, t) }}</dd>
      </div>
    </dl>
    <ElButton
      class="transfer-action"
      :icon="RefreshLeft"
      :loading="props.saving"
      data-test="restore-transfer"
      @click="emit('restore', props.transfer)"
    >
      {{ t('transfers.restore') }}
    </ElButton>
  </article>
</template>

<style scoped>
.transfer-card {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.transfer-card-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.transfer-label,
.transfer-amount,
.transfer-description,
.transfer-details,
.transfer-details dd {
  margin: 0;
}

.transfer-label,
.transfer-amount {
  color: var(--color-text);
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.transfer-amount {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.transfer-description,
.transfer-details dd {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.transfer-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.transfer-details > :last-child {
  grid-column: 1 / -1;
}

.transfer-details dt {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}

.transfer-action {
  width: 100%;
  min-height: 44px;
  margin-top: 16px;
}
</style>
