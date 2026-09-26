<script setup>
import { useI18n } from 'vue-i18n'
import { ElEmpty, ElPagination } from 'element-plus'
import { formatGoalMoney } from '@/utils/goals/goalPresentation'

const props = defineProps({ items: { type: Array, default: () => [] }, meta: { type: Object, default: null } })
const emit = defineEmits(['page-change'])
const { t, locale } = useI18n()
function dateTimeLabel(value) { return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) }
</script>

<template>
  <section :aria-label="t('goals.activity')" class="activity-list">
    <ElEmpty v-if="props.items.length === 0" :description="t('goals.noActivity')" />
    <ol v-else>
      <li v-for="item in props.items" :key="item.id" class="activity-row">
        <div class="activity-line"><div class="activity-main"><strong>{{ t(`goals.activityType.${item.type}`) }}</strong><time :datetime="item.occurred_at">{{ dateTimeLabel(item.occurred_at) }}</time></div><span v-if="item.amount_centavos !== null" class="activity-amount">{{ item.type === 'withdrawn' ? '−' : '+' }}{{ formatGoalMoney(item.amount_centavos, locale) }}</span></div>
        <p v-if="item.account_at_time">{{ t('goals.accountAtTime', { name: item.account_at_time.name }) }}</p>
        <p v-else-if="item.amount_centavos !== null">{{ t('goals.unverified') }}</p>
      </li>
    </ol>
    <ElPagination v-if="props.meta?.last_page > 1" :current-page="props.meta.current_page" :page-count="props.meta.last_page" layout="prev, pager, next" @current-change="emit('page-change', $event)" />
  </section>
</template>

<style scoped>
.activity-list { min-width: 0; }
.activity-list ol { margin: 0; padding: 0 0 0 20px; list-style: none; }
.activity-row { position: relative; padding: 0 0 20px 22px; border-left: 1px solid var(--color-border); overflow-wrap: anywhere; }
.activity-row:last-child { padding-bottom: 0; border-left-color: transparent; }
.activity-row::before { position: absolute; top: 4px; left: -5px; width: 9px; height: 9px; border-radius: 50%; background: var(--color-action-primary); content: ''; }
.activity-line { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 4px 16px; }
.activity-main { display: grid; gap: 2px; }
.activity-main strong { color: var(--color-text); font-size: 14px; }
.activity-main time, .activity-row p { color: var(--color-text-muted); font-size: 13px; }
.activity-amount { color: var(--color-action-primary); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.activity-row p { margin: 4px 0 0; }
.activity-list :deep(.el-pagination) { margin-top: 20px; flex-wrap: wrap; }
</style>
