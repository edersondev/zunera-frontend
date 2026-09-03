<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  activeRoute: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['navigate'])
</script>

<template>
  <nav aria-label="Primary navigation" class="primary-navigation">
    <ElMenu :default-active="props.activeRoute" @select="emit('navigate', $event)">
      <ElMenuItem
        v-for="item in props.items"
        :key="item.routeName"
        :index="item.routeName"
        :aria-current="item.routeName === props.activeRoute ? 'page' : undefined"
      >
        <ElIcon v-if="item.icon">
          <component :is="item.icon" />
        </ElIcon>
        <span>{{ item.label }}</span>
      </ElMenuItem>
    </ElMenu>
  </nav>
</template>

<style scoped>
.primary-navigation {
  min-width: 0;
}

.primary-navigation :deep(.el-menu) {
  border-right: 0;
  --el-menu-bg-color: var(--color-surface);
  --el-menu-text-color: var(--color-text);
  --el-menu-hover-text-color: var(--color-text);
  --el-menu-hover-bg-color: var(--color-surface-secondary);
  --el-menu-active-color: var(--color-action-primary);
}

.primary-navigation :deep(.el-menu-item:hover) {
  color: var(--color-text);
}

.primary-navigation :deep(.el-menu-item.is-active) {
  background: var(--color-action-primary-subtle);
  color: var(--color-action-primary);
}
</style>
