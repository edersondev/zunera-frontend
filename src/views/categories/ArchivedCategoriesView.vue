<script setup>
import { onMounted, reactive, shallowRef } from 'vue'
import { CollectionTag } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import CategoryLifecycleDialog from '@/components/categories/CategoryLifecycleDialog.vue'
import CategoryList from '@/components/categories/CategoryList.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useCategoryStore } from '@/stores/categories/categoryStore'
import { useI18n } from 'vue-i18n'

const store = useCategoryStore()
const { t } = useI18n()
const router = useRouter()
const successMessage = shallowRef('')
const lifecycle = reactive({ visible: false, action: 'restore', category: null })
onMounted(() => store.fetchCategories('archived').catch(() => {}))
function askRestore(category) {
  lifecycle.category = category
  lifecycle.visible = true
}
function openCategories() {
  router.push({ name: 'categories' })
}
async function confirmRestore() {
  try {
    await store.restore(lifecycle.category)
    lifecycle.visible = false
    successMessage.value = t('categories.restored')
  } catch {}
}
</script>

<template>
  <div>
    <PageHeader
      :title="t('categories.archivedTitle')"
      :description="t('categories.archivedDescription')"
    >
      <template #actions>
        <ElButton data-test="open-categories" :icon="CollectionTag" @click="openCategories">
          {{ t('categories.title') }}
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
    <CategoryList
      :categories="store.archivedCategories"
      archived
      :loading="store.loading"
      @restore="askRestore"
    />
    <CategoryLifecycleDialog
      v-model:visible="lifecycle.visible"
      :category="lifecycle.category"
      :action="lifecycle.action"
      :loading="store.lifecycleLoading"
      @confirm="confirmRestore"
    />
  </div>
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
}
</style>
