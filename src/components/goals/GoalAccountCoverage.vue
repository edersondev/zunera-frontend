<script setup>
import { computed } from 'vue'
import { CircleCheck, InfoFilled, Warning } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { ElIcon, ElTag } from 'element-plus'
import { formatGoalMoney } from '@/utils/goals/goalPresentation'

const props = defineProps({ goal: { type: Object, required: true } })
const { t, locale } = useI18n()
const account = computed(() => props.goal.financial_account)
const backing = computed(() => props.goal.account_backing)
const statusIcon = computed(() => backing.value === 'available' ? CircleCheck : backing.value === 'unverified' ? InfoFilled : Warning)
</script>

<template>
  <section class="coverage" :aria-label="t('goals.accountCoverage')">
    <h2>{{ t('goals.accountCoverage') }}</h2>
    <div v-if="account" class="coverage-account"><strong>{{ account.name }}</strong><ElTag :type="account.status === 'active' ? undefined : 'info'" effect="plain" size="small">{{ t(`goals.accountStatus.${account.status}`) }}</ElTag></div>
    <div class="coverage-status" :class="{ 'has-warning': backing === 'shortfall' || backing === 'inactive_or_unavailable', 'is-unverified': backing === 'unverified' }"><ElIcon aria-hidden="true"><component :is="statusIcon" /></ElIcon><span>{{ t(`goals.backing.${backing}`) }}</span></div>
    <p v-if="!account" class="coverage-note">{{ t('goals.unverifiedHelp') }}</p>
    <template v-else>
      <dl class="coverage-values">
        <div><dt>{{ t('goals.actual') }}</dt><dd>{{ account.current_balance_centavos === null ? t('goals.unavailable') : formatGoalMoney(account.current_balance_centavos, locale) }}</dd></div>
        <div><dt>{{ t('goals.designated') }}</dt><dd>{{ formatGoalMoney(account.designated_centavos, locale) }}</dd></div>
        <div><dt>{{ t('goals.unallocated') }}</dt><dd>{{ account.unallocated_centavos === null ? t('goals.unavailable') : formatGoalMoney(account.unallocated_centavos, locale) }}</dd></div>
      </dl>
      <p v-if="account.shortfall_centavos > 0" class="coverage-shortfall">{{ t('goals.shortfall', { amount: formatGoalMoney(account.shortfall_centavos, locale) }) }}</p>
      <p v-if="backing === 'shortfall' || backing === 'inactive_or_unavailable'" class="coverage-note">{{ t('goals.correctiveAction') }}</p>
    </template>
    <p class="coverage-explanation">{{ t('goals.allocationHelp') }}</p>
  </section>
</template>

<style scoped>
.coverage { display: grid; align-content: start; gap: 14px; min-width: 0; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.coverage h2, .coverage p { margin: 0; }
.coverage h2 { color: var(--color-text); font-size: 18px; line-height: 26px; }
.coverage-account { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; color: var(--color-text); }
.coverage-account strong { overflow-wrap: anywhere; }
.coverage-status { display: flex; align-items: flex-start; gap: 8px; color: var(--color-success); font-size: 14px; font-weight: 600; }
.coverage-status .el-icon { flex: none; margin-top: 3px; }
.coverage-status.has-warning { color: var(--color-warning); }
.coverage-status.is-unverified { color: var(--color-text-subtle); }
.coverage-values { display: grid; gap: 0; margin: 0; border-top: 1px solid var(--color-border); }
.coverage-values div { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-border); min-width: 0; }
.coverage-values dt { color: var(--color-text-muted); font-size: 13px; }
.coverage-values dd { margin: 0; color: var(--color-text); font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.coverage-note, .coverage-explanation { color: var(--color-text-muted); font-size: 13px; line-height: 20px; }
.coverage-shortfall { color: var(--color-warning); font-size: 14px; font-weight: 600; }
.coverage-explanation { padding-top: 12px; border-top: 1px solid var(--color-border); }
@media (max-width: 639px) { .coverage { padding: 16px; } .coverage-values div { flex-wrap: wrap; } }
</style>
