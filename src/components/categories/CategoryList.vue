<script setup>
import { Edit, FolderDelete, RefreshLeft } from '@element-plus/icons-vue'
import {
  CLASSIFICATION_LABELS,
  COLOR_LABELS,
  ICON_LABELS,
  categoryColorStyle,
} from '@/utils/categories/categoryOptions'

const props = defineProps({
  categories: { type: Array, required: true },
  archived: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['archive', 'edit', 'restore'])
</script>

<template>
  <div v-loading="props.loading">
    <ElEmpty
      v-if="!props.categories.length"
      :description="
        props.archived
          ? 'No archived categories yet.'
          : 'No active categories yet. Create one to get started.'
      "
    />
    <ul v-else class="category-list">
      <li v-for="category in props.categories" :key="category.id" class="category-card">
        <span
          class="category-color"
          :style="categoryColorStyle(category.color)"
          :aria-label="`${COLOR_LABELS[category.color] ?? category.color} category color`"
          role="img"
        />
        <div class="category-identity">
          <span class="category-name">{{ category.name }}</span>
          <div class="category-meta">
            <ElTag size="small" effect="plain">{{
              CLASSIFICATION_LABELS[category.classification] ?? category.classification
            }}</ElTag>
            <span>{{ ICON_LABELS[category.icon] ?? category.icon }}</span>
            <ElTag v-if="category.origin === 'system'" size="small" type="info"
              >System default</ElTag
            >
            <ElTag v-if="props.archived" size="small" type="warning">Archived</ElTag>
          </div>
        </div>
        <div v-if="category.origin === 'personal'" class="category-actions">
          <ElButton
            v-if="!props.archived"
            :icon="Edit"
            plain
            aria-label="Edit category"
            @click="emit('edit', category)"
            >Edit</ElButton
          >
          <ElButton
            v-if="!props.archived"
            :icon="FolderDelete"
            plain
            type="warning"
            @click="emit('archive', category)"
            >Archive</ElButton
          >
          <ElButton
            v-else
            :icon="RefreshLeft"
            plain
            type="primary"
            @click="emit('restore', category)"
            >Restore</ElButton
          >
        </div>
        <p v-else class="read-only">System default</p>
      </li>
    </ul>
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
.category-card {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.category-color {
  width: 12px;
  height: 32px;
  border-radius: var(--radius-full);
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
    grid-template-columns: 12px minmax(0, 1fr);
  }
  .category-actions,
  .read-only {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
