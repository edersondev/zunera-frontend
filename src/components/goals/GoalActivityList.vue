<script setup>
import { useI18n } from 'vue-i18n'
import { ElEmpty, ElPagination } from 'element-plus'
import { formatBRL } from '@/utils/financial-accounts/currency'

const props = defineProps({ items: { type: Array, default: () => [] }, meta: { type: Object, default: null } })
const emit = defineEmits(['page-change'])
const { t, locale } = useI18n()
function dateLabel(value) { return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)) }
</script>

<template>
  <section :aria-label="t('goals.activity')" class="activity-list">
    <ElEmpty v-if="props.items.length === 0" :description="t('goals.noActivity')" />
    <ol v-else>
      <li v-for="item in props.items" :key="item.id" class="activity-row">
        <div><strong>{{ t(`goals.activityType.${item.type}`) }}</strong><span> · {{ dateLabel(item.business_date) }}</span></div>
        <p v-if="item.amount_centavos !== null">{{ item.type === 'withdrawn' ? '−' : '+' }}{{ formatBRL(item.amount_centavos) }}</p>
        <p v-if="item.account_at_time">{{ t('goals.accountAtTime', { name: item.account_at_time.name }) }}</p>
        <p v-else-if="item.amount_centavos !== null">{{ t('goals.unverified') }}</p>
      </li>
    </ol>
    <ElPagination v-if="props.meta?.last_page > 1" :current-page="props.meta.current_page" :page-count="props.meta.last_page" layout="prev, pager, next" @current-change="emit('page-change', $event)" />
  </section>
</template>

<style scoped>
.activity-list { min-width: 0; }
.activity-list ol { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.activity-row { padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow-wrap: anywhere; }
.activity-row p { margin: 4px 0 0; color: var(--color-text-muted); }
</style>
