<script setup>
import { onMounted, reactive, shallowRef } from 'vue'
import { Check, CirclePlus, Close, FolderOpened, Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import CategoryForm from '@/components/categories/CategoryForm.vue'
import CategoryLifecycleDialog from '@/components/categories/CategoryLifecycleDialog.vue'
import CategoryList from '@/components/categories/CategoryList.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useCategoryStore } from '@/stores/categories/categoryStore'
import { useI18n } from 'vue-i18n'

const store = useCategoryStore()
const { t } = useI18n()
const router = useRouter()
const formRef = shallowRef(null)
const createDialogVisible = shallowRef(false)
const editDialogVisible = shallowRef(false)
const editingCategory = shallowRef(null)
const successMessage = shallowRef('')
const lifecycle = reactive({ visible: false, action: 'archive', category: null })
onMounted(() => store.fetchCategories('active').catch(() => {}))

function openCreateDialog() {
  successMessage.value = ''
  createDialogVisible.value = true
}
function openArchivedCategories() {
  router.push({ name: 'categories-archived' })
}
function closeCreateDialog() {
  if (!store.creating) createDialogVisible.value = false
}
function openEditDialog(category) {
  successMessage.value = ''
  editingCategory.value = category
  editDialogVisible.value = true
}
function closeEditDialog() {
  if (!store.updating) {
    editDialogVisible.value = false
    editingCategory.value = null
  }
}
async function createCategory(payload) {
  successMessage.value = ''
  try {
    await store.create(payload)
    formRef.value?.resetCreateForm?.()
    createDialogVisible.value = false
    successMessage.value = t('categories.created')
  } catch {}
}
async function updateCategory(payload) {
  if (!editingCategory.value) return
  successMessage.value = ''
  try {
    await store.update(editingCategory.value.id, payload)
    closeEditDialog()
    successMessage.value = t('categories.saved')
  } catch {}
}
function askArchive(category) {
  lifecycle.category = category
  lifecycle.action = 'archive'
  lifecycle.visible = true
}
async function confirmLifecycle() {
  try {
    await store.archive(lifecycle.category)
    lifecycle.visible = false
    successMessage.value = t('categories.archivedSuccess')
  } catch {}
}
</script>

<template>
  <div>
    <PageHeader
      :title="t('categories.title')"
      :description="t('categories.description')"
    >
      <template #actions>
        <ElButton
          data-test="open-create-category"
          type="primary"
          :icon="Plus"
          @click="openCreateDialog"
        >
          {{ t('categories.new') }}
        </ElButton>
        <ElButton
          data-test="open-archived-categories"
          type="warning"
          :icon="FolderOpened"
          @click="openArchivedCategories"
        >
          {{ t('categories.archived') }}
        </ElButton>
      </template>
    </PageHeader>
    <ElAlert
      v-if="successMessage"
      class="feedback"
      :title="successMessage"
      type="success"
      show-icon
    />
    <ElAlert
      v-if="store.error"
      class="feedback"
      :title="store.error.message"
      type="error"
      show-icon
    />
    <section class="content-section" aria-labelledby="active-categories-title">
      <h2 id="active-categories-title">{{ t('categories.active') }}</h2>
      <CategoryList
        :categories="store.categories"
        :loading="store.loading"
        @archive="askArchive"
        @edit="openEditDialog"
      />
    </section>
    <ElDialog
      v-model="createDialogVisible"
      :title="t('categories.newDialog')"
      width="min(92vw, 640px)"
      :close-on-click-modal="!store.creating"
      :close-on-press-escape="!store.creating"
      :show-close="!store.creating"
      destroy-on-close
    >
      <CategoryForm
        ref="formRef"
        form-id="create-category-form"
        :show-submit="false"
        :submitting="store.creating"
        @submit="createCategory"
      />
      <template #footer
        ><ElButton :icon="Close" type="danger" :disabled="store.creating" @click="closeCreateDialog"
          >{{ t('common.cancel') }}</ElButton
        ><ElButton
          data-test="create-category"
          :icon="CirclePlus"
          native-type="submit"
          type="primary"
          form="create-category-form"
          :loading="store.creating"
          >{{ t('categories.create') }}</ElButton
        ></template
      >
    </ElDialog>
    <ElDialog
      v-model="editDialogVisible"
      :title="t('categories.editDialog')"
      width="min(92vw, 640px)"
      :close-on-click-modal="!store.updating"
      :close-on-press-escape="!store.updating"
      :show-close="!store.updating"
      destroy-on-close
    >
      <CategoryForm
        v-if="editingCategory"
        form-id="edit-category-form"
        :category="editingCategory"
        :show-submit="false"
        :submitting="store.updating"
        @submit="updateCategory"
      />
      <template #footer
        ><ElButton :icon="Close" type="danger" :disabled="store.updating" @click="closeEditDialog"
          >{{ t('common.cancel') }}</ElButton
        ><ElButton
          data-test="save-category"
          :icon="Check"
          native-type="submit"
          type="primary"
          form="edit-category-form"
          :loading="store.updating"
          >{{ t('categories.saveChanges') }}</ElButton
        ></template
      >
    </ElDialog>
    <CategoryLifecycleDialog
      v-model:visible="lifecycle.visible"
      :category="lifecycle.category"
      :action="lifecycle.action"
      :loading="store.lifecycleLoading"
      @confirm="confirmLifecycle"
    />
  </div>
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
}
.content-section {
  margin-top: 24px;
}
.content-section h2 {
  margin: 0 0 12px;
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}
</style>
