<script setup>
import { RefreshRight, RefreshLeft } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

defineProps({
  archives: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  loadError: { type: Boolean, default: false },
})
const emit = defineEmits(['retry', 'restore'])
const { t, locale } = useI18n()

function formatDate(value) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
</script>

<template>
  <section class="archives" aria-labelledby="archives-title">
    <h2 id="archives-title">{{ t('accountData.archivesTitle') }}</h2>
    <p>{{ t('accountData.archivesDescription') }}</p>
    <ElSkeleton v-if="loading" :rows="2" animated />
    <ElAlert v-else-if="loadError" type="error" :title="t('accountData.loadError')" :closable="false" show-icon>
      <ElButton :icon="RefreshRight" @click="emit('retry')">{{ t('common.retry') }}</ElButton>
    </ElAlert>
    <ElEmpty v-else-if="archives.length === 0" :description="t('accountData.noArchives')" />
    <div v-else class="archive-list">
      <ElCard v-for="archive in archives" :key="archive.id">
        <div class="archive-row">
          <div>
            <h3>{{ t('accountData.archiveNumber', { id: archive.id }) }}</h3>
            <p>{{ formatDate(archive.created_at) }} · {{ t('accountData.recordCount', { count: archive.record_count }) }}</p>
          </div>
          <div class="archive-actions">
            <RouterLink :to="{ name: 'account-data-archive', params: { archive_id: archive.id } }">{{ t('accountData.viewArchive', { id: archive.id }) }}</RouterLink>
            <ElButton :icon="RefreshLeft" :aria-label="t('accountData.restoreTitle', { id: archive.id })" @click="emit('restore', archive, $event.currentTarget)">{{ t('accountData.restoreAction') }}</ElButton>
          </div>
        </div>
      </ElCard>
    </div>
  </section>
</template>

<style scoped>
.archives { margin-top: 32px; }
.archives h2 { margin: 0 0 8px; font-size: 20px; }
.archives p, .archive-row p { color: var(--color-text-muted); line-height: 1.5; }
.archive-list { display: grid; gap: 12px; }
.archive-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.archive-row h3 { margin: 0; font-size: 16px; }
.archive-row p { margin: 6px 0 0; }
.archive-actions { display: flex; align-items: center; gap: 16px; }
@media (max-width: 639px) {
  .archive-row { align-items: flex-start; flex-direction: column; }
  .archive-actions { width: 100%; justify-content: space-between; flex-wrap: wrap; }
}
</style>
