<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const route = useRoute()
const activePath = computed(() => route.path)
</script>

<template>
  <nav aria-label="Primary navigation" class="primary-navigation">
    <ElMenu router :default-active="activePath">
      <ElMenuItem v-for="item in props.items" :key="item.route" :index="item.route">
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
}
</style>
