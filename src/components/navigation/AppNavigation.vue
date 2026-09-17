<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

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
const { t } = useI18n()

function isActiveRoute(item) {
  return (item.activeRouteNames ?? [item.routeName]).includes(props.activeRoute)
}

const activeGroup = computed(
  () =>
    props.items.find((item) =>
      item.children?.some(isActiveRoute),
    )?.id ?? null,
)
const defaultOpeneds = computed(() => (activeGroup.value === null ? [] : [activeGroup.value]))
</script>

<template>
  <nav :aria-label="t('app.primaryNavigation')" class="primary-navigation">
    <ElMenu
      :key="activeGroup ?? 'root'"
      :default-active="props.activeRoute"
      :default-openeds="defaultOpeneds"
      :unique-opened="true"
      @select="emit('navigate', $event)"
    >
      <template v-for="item in props.items" :key="item.id">
        <ElSubMenu v-if="item.children" :index="item.id" :data-test="`navigation-group-${item.id}`">
          <template #title>
            <ElIcon v-if="item.icon">
              <component :is="item.icon" />
            </ElIcon>
            <span>{{ item.label }}</span>
          </template>
          <ElMenuItem
            v-for="child in item.children"
            :key="child.routeName"
            :index="child.routeName"
            :aria-current="isActiveRoute(child) ? 'page' : undefined"
            :data-test="`navigation-item-${child.routeName}`"
          >
            <ElIcon v-if="child.icon">
              <component :is="child.icon" />
            </ElIcon>
            <span>{{ child.label }}</span>
          </ElMenuItem>
        </ElSubMenu>
        <ElMenuItem
          v-else
          :index="item.routeName"
          :aria-current="isActiveRoute(item) ? 'page' : undefined"
          :data-test="`navigation-item-${item.routeName}`"
        >
          <ElIcon v-if="item.icon">
            <component :is="item.icon" />
          </ElIcon>
          <span>{{ item.label }}</span>
        </ElMenuItem>
      </template>
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
