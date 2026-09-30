<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import NotificationItem from './NotificationItem.vue'

const props = defineProps({
  items: { type: Array, required: true },
  view: { type: String, required: true },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: false },
})
const emit = defineEmits(['read', 'open', 'more', 'retry'])
const { t } = useI18n()
const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
function dayKey(value) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
const groups = computed(() => {
  if (props.items.length < 2) return [{ key: 'single', label: '', items: props.items }]
  const today = dayKey(new Date())
  const [year, month, day] = today.split('-').map(Number)
  const yesterday = new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10)
  const result = []
  for (const item of props.items) {
    const date = new Date(item.created_at ?? item.event_at)
    const key = Number.isNaN(date.getTime()) ? 'earlier' : dayKey(date)
    const section = key === today ? 'today' : key === yesterday ? 'yesterday' : 'earlier'
    const previous = result.at(-1)
    if (previous?.key === section) previous.items.push(item)
    else result.push({ key: section, label: t(`notifications.group.${section}`), items: [item] })
  }
  return result
})
</script>

<template>
  <section :aria-label="t('notifications.history')" class="notification-list">
    <ElAlert v-if="error" :title="t('notifications.loadError')" type="error" show-icon :closable="false">
      <ElButton text @click="emit('retry')">{{ t('common.retry') }}</ElButton>
    </ElAlert>
    <div v-if="loading && items.length === 0" class="feed-skeleton" aria-hidden="true">
      <ElSkeleton v-for="index in 3" :key="index" animated>
        <template #template>
          <div class="skeleton-row">
            <ElSkeletonItem variant="circle" class="skeleton-icon" />
            <div class="skeleton-lines">
              <ElSkeletonItem variant="text" class="skeleton-title" />
              <ElSkeletonItem variant="text" class="skeleton-message" />
              <ElSkeletonItem variant="text" class="skeleton-meta" />
            </div>
          </div>
        </template>
      </ElSkeleton>
    </div>
    <ElEmpty v-else-if="!error && items.length === 0" class="feed-empty" :image-size="48" :description="t(`notifications.empty.${view}`)" />
    <div v-else class="feed-groups">
      <div v-for="(group, index) in groups" :key="`${group.key}-${index}`" class="feed-group">
        <h2 v-if="group.label" class="group-heading">{{ group.label }}</h2>
        <ul class="items">
          <li v-for="item in group.items" :key="item.id">
            <NotificationItem :item="item" @read="emit('read', $event)" @open="emit('open', $event)" />
          </li>
        </ul>
      </div>
    </div>
    <ElButton v-if="hasMore" class="load-more" :loading="loading" @click="emit('more')">{{ t('notifications.loadMore') }}</ElButton>
  </section>
</template>

<style scoped>
.notification-list { display: grid; gap: 16px; }
.feed-groups { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.feed-group { min-width: 0; }
.feed-group + .feed-group { border-top: 1px solid var(--color-border); }
.group-heading { margin: 0; padding: 10px 18px; background: var(--color-surface-secondary); color: var(--color-text-subtle); font-size: 12px; font-weight: 700; line-height: 18px; text-transform: uppercase; letter-spacing: .04em; }
.items { padding: 0; margin: 0; list-style: none; }
.items li + li { border-top: 1px solid var(--color-border); }
.load-more { justify-self: center; }
.feed-empty { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.feed-skeleton { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.feed-skeleton :deep(.el-skeleton + .el-skeleton) { border-top: 1px solid var(--color-border); }
.skeleton-row { display: flex; gap: 14px; padding: 17px 24px; }
.skeleton-icon { width: 36px; height: 36px; flex: none; }
.skeleton-lines { display: grid; width: 100%; gap: 8px; }
.skeleton-title { width: 45%; }
.skeleton-message { width: 74%; }
.skeleton-meta { width: 36%; }
@media (max-width: 639px) { .skeleton-row { padding: 14px 12px; } }
</style>
