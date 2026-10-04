<script setup>
import { Delete, FolderDelete, RefreshRight } from '@element-plus/icons-vue'
import { onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import AccountDataActionDialog from '@/components/account-data/AccountDataActionDialog.vue'
import {
  archiveAccountData,
  deleteAccountData,
  listAccountDataArchives,
} from '@/services/accountDataService'

const { t, locale } = useI18n()
const router = useRouter()
const archives = shallowRef([])
const loading = shallowRef(false)
const loadError = shallowRef(false)
const actionError = shallowRef(null)
const mode = shallowRef('archive')
const dialogOpen = shallowRef(false)
const busy = shallowRef(false)
const archiveButton = shallowRef(null)
const deleteButton = shallowRef(null)

onMounted(loadArchives)

async function loadArchives() {
  loading.value = true
  loadError.value = false
  try {
    archives.value = await listAccountDataArchives()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function openDialog(nextMode) {
  mode.value = nextMode
  actionError.value = null
  dialogOpen.value = true
}

function onDialogClosed() {
  actionError.value = null
  const button = mode.value === 'delete' ? deleteButton.value : archiveButton.value
  button?.$el?.focus()
}

async function confirmAction(password) {
  if (busy.value) return
  busy.value = true
  actionError.value = null
  try {
    if (mode.value === 'delete') await deleteAccountData(password)
    else await archiveAccountData()
    dialogOpen.value = false
    window.location.replace(router.resolve({ name: 'dashboard' }).href)
  } catch (error) {
    actionError.value = error
  } finally {
    busy.value = false
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
</script>

<template>
  <div class="account-data-settings">
    <PageHeader :title="t('accountData.title')" :description="t('accountData.description')" />
    <div class="action-grid">
      <ElCard>
        <h2>{{ t('accountData.archiveTitle') }}</h2>
        <p>{{ t('accountData.archiveDescription') }}</p>
        <template #footer>
          <div class="action-card-footer">
            <ElButton ref="archiveButton" type="primary" :icon="FolderDelete" @click="openDialog('archive')">{{ t('accountData.archiveAll') }}</ElButton>
          </div>
        </template>
      </ElCard>
      <ElCard>
        <h2>{{ t('accountData.deleteTitle') }}</h2>
        <p>{{ t('accountData.deleteDescription') }}</p>
        <template #footer>
          <div class="action-card-footer">
            <ElButton ref="deleteButton" type="danger" :icon="Delete" @click="openDialog('delete')">{{ t('accountData.deleteAll') }}</ElButton>
          </div>
        </template>
      </ElCard>
    </div>
    <section class="archives" aria-labelledby="archives-title">
      <h2 id="archives-title">{{ t('accountData.archivesTitle') }}</h2>
      <p>{{ t('accountData.archivesDescription') }}</p>
      <ElSkeleton v-if="loading" :rows="2" animated />
      <ElAlert v-else-if="loadError" type="error" :title="t('accountData.loadError')" :closable="false" show-icon>
        <ElButton :icon="RefreshRight" @click="loadArchives">{{ t('common.retry') }}</ElButton>
      </ElAlert>
      <ElEmpty v-else-if="archives.length === 0" :description="t('accountData.noArchives')" />
      <div v-else class="archive-list">
        <ElCard v-for="archive in archives" :key="archive.id">
          <div class="archive-row">
            <div>
              <h3>{{ t('accountData.archiveNumber', { id: archive.id }) }}</h3>
              <p>{{ formatDate(archive.created_at) }} · {{ t('accountData.recordCount', { count: archive.record_count }) }}</p>
            </div>
            <RouterLink :to="{ name: 'account-data-archive', params: { archive_id: archive.id } }">{{ t('accountData.viewArchive') }}</RouterLink>
          </div>
        </ElCard>
      </div>
    </section>
    <AccountDataActionDialog
      v-model="dialogOpen" :mode="mode" :busy="busy" :error="actionError"
      @confirm="confirmAction" @closed="onDialogClosed"
    />
  </div>
</template>

<style scoped>
.account-data-settings { width: min(100%, 980px); margin-inline: auto; }
.action-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.action-card-footer { display: flex; justify-content: flex-end; }
.action-grid h2, .archives h2 { margin: 0 0 8px; font-size: 20px; }
.action-grid p, .archives p, .archive-row p { color: var(--color-text-muted); line-height: 1.5; }
.archives { margin-top: 32px; }
.archive-list { display: grid; gap: 12px; }
.archive-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.archive-row h3 { margin: 0; font-size: 16px; }
.archive-row p { margin: 6px 0 0; }
@media (max-width: 639px) {
  .action-grid { grid-template-columns: 1fr; }
  .archive-row { align-items: flex-start; flex-direction: column; }
}
</style>
