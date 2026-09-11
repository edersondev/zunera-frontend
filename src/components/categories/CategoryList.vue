<script setup>
import { computed, shallowRef } from 'vue'
import { Edit, FolderDelete, RefreshLeft } from '@element-plus/icons-vue'
import {
  CATEGORY_ICON_COMPONENTS,
  CLASSIFICATION_LABELS,
  COLOR_LABELS,
  ICON_LABELS,
  categoryColorStyle,
} from '@/utils/categories/categoryOptions'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  categories: { type: Array, required: true },
  archived: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['archive', 'edit', 'restore'])
const { t } = useI18n()
const categoryTabs = computed(() => [
  { label: t('categories.all'), name: 'all' },
  { label: t('categories.expense'), name: 'expense' },
  { label: t('categories.income'), name: 'income' },
])
const activeTab = shallowRef('all')
const visibleCategories = computed(() =>
  activeTab.value === 'all'
    ? props.categories
    : props.categories.filter((category) => category.classification === activeTab.value),
)
const emptyDescription = computed(() => {
  const categoryType = activeTab.value === 'all' ? '' : `${t(`categories.${activeTab.value}`)} `

  return props.archived
    ? t('categories.emptyArchived', { type: categoryType })
    : t('categories.empty', { type: categoryType })
})
</script>

<template>
  <div v-loading="props.loading">
    <ElTabs v-model="activeTab" class="category-tabs">
      <ElTabPane
        v-for="tab in categoryTabs"
        :key="tab.name"
        :label="tab.label"
        :name="tab.name"
        lazy
      >
        <ElEmpty v-if="!visibleCategories.length" :description="emptyDescription" />
        <ul v-else class="category-list">
          <li v-for="category in visibleCategories" :key="category.id" class="category-card">
            <span
              class="category-color"
              :style="categoryColorStyle(category.color)"
              :aria-label="`${COLOR_LABELS[category.color] ?? category.color}, ${ICON_LABELS[category.icon] ?? category.icon}`"
              role="img"
            >
              <ElIcon :size="16" aria-hidden="true"
                ><component :is="CATEGORY_ICON_COMPONENTS[category.icon]"
              /></ElIcon>
            </span>
            <div class="category-identity">
              <span class="category-name">{{ category.name }}</span>
              <div class="category-meta">
                <ElTag
                  size="small"
                  effect="plain"
                  :type="category.classification === 'expense' ? 'danger' : undefined"
                  >{{
                    CLASSIFICATION_LABELS[category.classification] ?? category.classification
                  }}</ElTag
                >
                <ElTag v-if="category.origin === 'system'" size="small" type="info"
                  >{{ t('categories.systemDefault') }}</ElTag
                >
                <ElTag v-if="props.archived" size="small" type="warning">{{ t('categories.archivedTag') }}</ElTag>
              </div>
            </div>
            <div v-if="category.origin === 'personal'" class="category-actions">
              <ElButton
                v-if="!props.archived"
                :icon="Edit"
                plain
                :aria-label="t('categories.editLabel')"
                @click="emit('edit', category)"
                >{{ t('categories.edit') }}</ElButton
              >
              <ElButton
                v-if="!props.archived"
                :icon="FolderDelete"
                plain
                type="warning"
                @click="emit('archive', category)"
                >{{ t('categories.archive') }}</ElButton
              >
              <ElButton
                v-else
                :icon="RefreshLeft"
                plain
                type="primary"
                @click="emit('restore', category)"
                >{{ t('categories.restore') }}</ElButton
              >
            </div>
            <p v-else class="read-only">{{ t('categories.systemDefault') }}</p>
          </li>
        </ul>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<style scoped>
.category-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.category-tabs {
  margin-top: 16px;
}
.category-card {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.category-color {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-surface);
}
.category-name {
  color: var(--color-text);
  font-weight: 600;
  line-height: 24px;
}
.category-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}
.category-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.read-only {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 12px;
}
@media (max-width: 640px) {
  .category-card {
    grid-template-columns: 32px minmax(0, 1fr);
  }
  .category-actions,
  .read-only {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
