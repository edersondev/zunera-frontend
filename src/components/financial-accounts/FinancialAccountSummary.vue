<script setup>
import { formatBRL } from '@/utils/financial-accounts/currency'
import { useI18n } from 'vue-i18n'

defineProps({
  summary: {
    type: Object,
    required: true,
  },
})
const { t } = useI18n()
</script>

<template>
  <section class="account-summary" aria-labelledby="summary-title">
    <div>
      <h2 id="summary-title">{{ t('financialAccounts.activeSummary') }}</h2>
      <p class="summary-count">{{ t('financialAccounts.activeCount', { count: summary.active_account_count }) }}</p>
    </div>
    <p class="summary-balance">
      {{ formatBRL(summary.active_combined_balance_centavos) }}
    </p>
  </section>
</template>

<style scoped>
.account-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.account-summary h2 {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  color: var(--color-text);
}

.summary-count {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.summary-balance {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

@media (max-width: 640px) {
  .account-summary {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
