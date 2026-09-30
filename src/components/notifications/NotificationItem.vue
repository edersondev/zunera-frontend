<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Warning } from '@element-plus/icons-vue'
import NotificationSourceIcon from './NotificationSourceIcon.vue'
import { notificationDestination } from '@/services/notificationDestination'

const props = defineProps({ item: { type: Object, required: true } })
const emit = defineEmits(['read', 'open'])
const { t, locale } = useI18n()
const canOpen = computed(() => props.item.source_available && Boolean(notificationDestination(props.item.destination)))
const actionLabel = computed(() => {
  if (!canOpen.value) return ''
  const kind = props.item.destination.kind
  if (kind === 'recurring_card_occurrence') return t(props.item.requires_action ? 'notifications.action.reviewOccurrence' : 'notifications.action.viewOccurrence')
  return t(`notifications.action.${{
    credit_card_statement: 'viewStatement',
    transaction: 'viewTransaction',
    budget_plan: 'viewBudget',
    goal: 'viewGoal',
  }[kind] ?? 'viewDetails'}`)
})
const eventDate = computed(() => {
  const date = new Date(props.item.event_at)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  }).format(date)
})
const secondaryStatus = computed(() => {
  if (props.item.requires_action) return ''
  if (props.item.type === 'goal_reached') return t('notifications.informational')
  return props.item.resolved_at ? t('notifications.resolved') : ''
})
function openWithSpace(event) {
  if (!canOpen.value) return
  event.preventDefault()
  emit('open', props.item.id)
}
</script>

<template>
  <article class="notification-item" :class="{ 'is-unread': !item.read_at, 'needs-attention': item.requires_action }">
    <span class="read-indicator" :class="{ 'is-visible': !item.read_at }" aria-hidden="true" />
    <NotificationSourceIcon :source="item.origin" />
    <div class="item-main">
      <div class="item-content" :class="{ 'is-link': canOpen }" :role="canOpen ? 'button' : undefined" :tabindex="canOpen ? 0 : undefined" @click="canOpen && emit('open', item.id)" @keydown.enter="canOpen && emit('open', item.id)" @keydown.space="openWithSpace">
        <h2>{{ item.title }}</h2>
        <span v-if="!item.read_at" class="sr-only">{{ t('notifications.unreadItem') }}</span>
        <p class="item-summary">{{ item.summary }}</p>
        <p class="item-meta">
          <span>{{ t(`notifications.origin.${item.origin}`) }}</span>
          <span aria-hidden="true">·</span>
          <time :datetime="item.event_at">{{ eventDate }}</time>
        </p>
      </div>
      <div class="item-states">
        <span v-if="item.requires_action" class="attention-badge"><ElIcon aria-hidden="true"><Warning /></ElIcon>{{ t('notifications.pending') }}</span>
        <span v-else-if="secondaryStatus" class="secondary-status">{{ secondaryStatus }}</span>
        <span v-if="!item.source_available" class="unavailable">{{ t('notifications.sourceUnavailable') }}</span>
      </div>
    </div>
    <div class="item-actions">
      <ElButton v-if="!item.read_at" text class="read-action" @click="emit('read', item.id)">{{ t('notifications.markRead') }}</ElButton>
      <ElButton v-if="canOpen" plain type="primary" @click="emit('open', item.id)">{{ actionLabel }}</ElButton>
    </div>
  </article>
</template>

<style scoped>
.notification-item { display: grid; grid-template-columns: 8px 36px minmax(0, 1fr) auto; align-items: start; gap: 12px; padding: 16px 18px; border-inline-start: 2px solid transparent; background: var(--color-surface); }
.notification-item.needs-attention { border-inline-start-color: var(--color-warning); }
.read-indicator { width: 7px; height: 7px; margin-top: 14px; border-radius: 50%; }
.read-indicator.is-visible { background: var(--color-action-primary); }
.item-main { min-width: 0; }
.item-content { display: block; width: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: start; font: inherit; }
.item-content.is-link { cursor: pointer; border-radius: var(--radius-md); }
.item-content.is-link:hover h2 { color: var(--color-action-primary); text-decoration: underline; }
.item-content.is-link:focus-visible { outline: 2px solid var(--color-action-primary); outline-offset: 3px; }
.item-content h2 { margin: 0; color: var(--color-text); font-size: 15px; line-height: 22px; font-weight: 600; overflow-wrap: anywhere; }
.is-unread .item-content h2 { font-weight: 700; }
.item-summary { margin: 3px 0 0; color: var(--color-text-subtle); font-size: 14px; line-height: 21px; overflow-wrap: anywhere; }
.item-meta { display: flex; flex-wrap: wrap; gap: 6px; margin: 7px 0 0; color: var(--color-text-muted); font-size: 12px; line-height: 18px; }
.item-states { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 7px; font-size: 12px; line-height: 18px; }
.attention-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; border-radius: var(--radius-md); background: var(--color-warning-subtle); color: var(--color-text); font-weight: 700; }
.attention-badge .el-icon { color: var(--color-warning); }
.secondary-status { color: var(--color-text-muted); }
.unavailable { color: var(--color-text-subtle); }
.item-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 4px; padding-top: 2px; }
.item-actions :deep(.el-button) { margin: 0; min-height: 36px; }
.read-action { color: var(--color-text-subtle); }
@media (max-width: 767px) {
  .notification-item { grid-template-columns: 8px 36px minmax(0, 1fr); padding: 14px 12px; }
  .item-actions { grid-column: 3; justify-content: flex-start; padding-top: 0; }
  .item-actions :deep(.el-button) { min-height: 44px; }
}
</style>
