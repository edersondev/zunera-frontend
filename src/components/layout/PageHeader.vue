<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <header class="page-header" :class="{ 'has-center': $slots.center }">
    <div class="page-heading">
      <h1>{{ title }}</h1>
      <p v-if="description" class="page-description">{{ description }}</p>
    </div>
    <div v-if="$slots.center" class="page-center">
      <slot name="center" />
    </div>
    <div v-if="$slots.actions" class="page-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header.has-center {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.page-heading,
.page-center {
  min-width: 0;
}

.page-center {
  justify-self: center;
}

.has-center .page-actions {
  justify-self: end;
}

.page-header h1 {
  margin: 0;
  font-size: 30px;
  line-height: 36px;
  color: var(--color-text);
}

.page-description {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: 16px;
  line-height: 24px;
}

.page-actions {
  flex-shrink: 0;
}

@media (max-width: 899px) {
  .page-header.has-center {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .has-center .page-center {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .has-center .page-actions {
    grid-column: 2;
    grid-row: 1;
  }
}

@media (max-width: 639px) {
  .page-header {
    flex-direction: column;
  }

  .page-actions :deep(.el-button) {
    width: 100%;
  }

  .page-header.has-center {
    grid-template-columns: minmax(0, 1fr);
  }

  .has-center .page-heading {
    grid-row: 1;
  }

  .has-center .page-center {
    grid-column: 1;
    grid-row: 2;
  }

  .has-center .page-actions {
    grid-column: 1;
    grid-row: 3;
    justify-self: stretch;
  }

  .has-center .page-actions :deep(.el-dropdown) {
    width: 100%;
  }
}
</style>
