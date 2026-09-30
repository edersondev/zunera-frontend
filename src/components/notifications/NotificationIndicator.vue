<script setup>
import { Bell } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '@/stores/notifications/notificationStore'

const store = useNotificationStore()
const { t } = useI18n()
const accessibleLabel = computed(() => store.summary.unread_count > 0
  ? t(store.summary.unread_count === 1 ? 'notifications.indicatorUnreadOne' : 'notifications.indicatorUnread', { count: store.summary.unread_count })
  : t('notifications.indicatorEmpty'))
</script>

<template>
  <RouterLink class="notification-indicator" :to="{ name: 'notifications' }" :aria-label="accessibleLabel">
    <ElIcon aria-hidden="true"><Bell /></ElIcon>
    <span v-if="store.unreadLabel" class="notification-count" aria-hidden="true">{{ store.unreadLabel }}</span>
  </RouterLink>
</template>

<style scoped>
.notification-indicator {
  position: relative;
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-decoration: none;
}
.notification-indicator:hover {
  background: var(--color-surface-secondary);
}
.notification-indicator:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
.notification-count {
  position: absolute;
  top: -2px;
  right: -6px;
  min-width: 20px;
  padding: 1px 4px;
  border-radius: var(--radius-full);
  background: var(--color-danger);
  color: var(--color-on-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}
</style>
