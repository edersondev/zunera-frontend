<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElAlert } from 'element-plus'
import { formatBRL } from '@/utils/financial-accounts/currency'

const props = defineProps({ goal: { type: Object, required: true } })
const { t } = useI18n()
const account = computed(() => props.goal.financial_account)
const label = computed(() => t(`goals.backing.${props.goal.account_backing}`))
</script>

<template>
  <section class="coverage" :aria-label="t('goals.accountCoverage')">
    <ElAlert v-if="props.goal.account_backing !== 'available'" :title="label" :type="props.goal.account_backing === 'shortfall' ? 'warning' : 'info'" :closable="false" show-icon />
    <p v-else class="coverage-label">{{ label }}</p>
    <p v-if="!account" class="coverage-note">{{ t('goals.unverifiedHelp') }}</p>
    <template v-else>
      <p class="coverage-account">{{ account.name }} · {{ t(`goals.accountStatus.${account.status}`) }}</p>
      <dl class="coverage-values">
        <div><dt>{{ t('goals.actual') }}</dt><dd>{{ account.current_balance_centavos === null ? t('goals.unavailable') : formatBRL(account.current_balance_centavos) }}</dd></div>
        <div><dt>{{ t('goals.designated') }}</dt><dd>{{ formatBRL(account.designated_centavos) }}</dd></div>
        <div><dt>{{ t('goals.unallocated') }}</dt><dd>{{ account.unallocated_centavos === null ? t('goals.unavailable') : formatBRL(account.unallocated_centavos) }}</dd></div>
      </dl>
      <p v-if="account.shortfall_centavos > 0" class="coverage-shortfall">{{ t('goals.shortfall', { amount: formatBRL(account.shortfall_centavos) }) }}</p>
      <p v-if="props.goal.account_backing === 'shortfall' || props.goal.account_backing === 'inactive_or_unavailable'" class="coverage-note">{{ t('goals.correctiveAction') }}</p>
    </template>
  </section>
</template>

<style scoped>
.coverage { display: grid; gap: 12px; min-width: 0; }
.coverage-label, .coverage-account, .coverage-note, .coverage-shortfall { margin: 0; }
.coverage-account { color: var(--color-text); font-weight: 600; }
.coverage-note { color: var(--color-text-muted); }
.coverage-shortfall { color: var(--color-danger); font-weight: 600; }
.coverage-values { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 0; }
.coverage-values div { padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface-secondary); }
.coverage-values dt { color: var(--color-text-muted); font-size: 12px; }
.coverage-values dd { margin: 4px 0 0; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; font-weight: 600; }
</style>
