<script setup>
import { nextTick, onMounted, shallowRef } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import NotificationFilterBar from '@/components/notifications/NotificationFilterBar.vue'
import NotificationList from '@/components/notifications/NotificationList.vue'
import NotificationPreferences from '@/components/notifications/NotificationPreferences.vue'
import { notificationDestination } from '@/services/notificationDestination'
import { showActionSuccess } from '@/services/actionMessage'
import { useNotificationStore } from '@/stores/notifications/notificationStore'

const store = useNotificationStore()
const router = useRouter()
const { t } = useI18n()
const actionError = shallowRef('')
const settingsOpen = shallowRef(false)
const settingsTrigger = shallowRef(null)

onMounted(() => {
  store.loadFirst(store.view)
  store.loadSummary()
  store.loadPreferences()
})

async function restoreSettingsFocus() {
  await nextTick()
  settingsTrigger.value?.$el?.focus()
}

async function markRead(id) {
  actionError.value = ''
  try {
    if (await store.markRead(id)) showActionSuccess(t('notifications.markedRead'))
  } catch {
    actionError.value = t('notifications.actionError')
  }
}

async function markAllRead() {
  actionError.value = ''
  try {
    if (await store.markAllRead()) showActionSuccess(t('notifications.allMarkedRead'))
  } catch {
    actionError.value = t('notifications.actionError')
  }
}

async function open(id) {
  actionError.value = ''
  try {
    const item = await store.open(id)
    if (!item) return
    const destination = notificationDestination(item.destination)
    if (destination) await router.push(destination)
    else actionError.value = t('notifications.sourceUnavailable')
  } catch {
    actionError.value = t('notifications.actionError')
  }
}

async function updatePreference(category, enabled) {
  if (await store.setPreference(category, enabled)) showActionSuccess(t('notifications.preferenceSaved'))
}
</script>

<template>
  <div class="notifications-view">
    <PageHeader :title="t('notifications.title')" :description="t('notifications.description')">
      <template #actions>
        <div class="header-actions">
          <ElButton ref="settingsTrigger" :icon="Setting" @click="settingsOpen = true">{{ t('notifications.settings') }}</ElButton>
          <ElButton :disabled="store.summary.unread_count === 0" @click="markAllRead">{{ t('notifications.markAllRead') }}</ElButton>
        </div>
      </template>
    </PageHeader>
    <ElAlert v-if="actionError" :title="actionError" type="warning" show-icon :closable="false" />
    <div class="feed-toolbar">
      <NotificationFilterBar :view="store.view" @change="store.loadFirst($event)" />
      <p v-if="store.summaryLoaded" class="feed-summary">{{ t('notifications.summary', { unread: store.summary.unread_count, attention: store.summary.requires_action_count }) }}</p>
    </div>
    <NotificationList
      :items="store.items" :view="store.view" :loading="store.loading" :error="Boolean(store.error)"
      :has-more="store.hasMore" @read="markRead" @open="open" @more="store.loadMore"
      @retry="store.loadFirst(store.view)"
    />
    <ElDrawer v-model="settingsOpen" size="min(94vw, 520px)" :title="t('notifications.preferences.title')" @closed="restoreSettingsFocus">
      <NotificationPreferences
        :preferences="store.preferences" :loaded="store.preferencesLoaded" :loading="store.preferencesLoading"
        :updating-category="store.updatingCategory" :error="Boolean(store.preferencesError)"
        @change="updatePreference" @retry="store.loadPreferences"
      />
    </ElDrawer>
  </div>
</template>

<style scoped>
.notifications-view { display: grid; gap: 18px; width: min(100%, 980px); margin-inline: auto; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.header-actions :deep(.el-button) { margin: 0; }
.feed-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 18px; }
.feed-summary { margin: 0; color: var(--color-text-muted); font-size: 12px; line-height: 18px; }
@media (max-width: 639px) {
  .header-actions { width: 100%; justify-content: stretch; }
  .header-actions :deep(.el-button) { width: auto; flex: 1; min-height: 44px; }
}
</style>
