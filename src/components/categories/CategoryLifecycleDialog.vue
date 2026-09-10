<script setup>
import { computed } from 'vue'
import { Close, FolderDelete, RefreshLeft } from '@element-plus/icons-vue'

const props = defineProps({
  visible: { type: Boolean, required: true },
  category: { type: Object, default: null },
  action: {
    type: String,
    required: true,
    validator: (value) => ['archive', 'restore'].includes(value),
  },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:visible', 'confirm', 'cancel'])
const title = computed(() => (props.action === 'archive' ? 'Archive category' : 'Restore category'))
const actionLabel = computed(() =>
  props.action === 'archive' ? 'Archive category' : 'Restore category',
)
const actionIcon = computed(() => (props.action === 'archive' ? FolderDelete : RefreshLeft))
const description = computed(() =>
  props.category
    ? props.action === 'archive'
      ? `Archive "${props.category.name}"? It will no longer appear for new transactions, while past history stays intact.`
      : `Restore "${props.category.name}"? It will become available for new transactions again.`
    : '',
)
</script>

<template>
  <ElDialog
    :model-value="props.visible"
    :title="title"
    width="min(92vw, 480px)"
    @update:model-value="emit('update:visible', $event)"
    @closed="emit('cancel')"
  >
    <p class="dialog-description">{{ description }}</p>
    <template #footer
      ><ElButton :icon="Close" :disabled="props.loading" @click="emit('update:visible', false)"
        >Cancel</ElButton
      ><ElButton
        :icon="actionIcon"
        :loading="props.loading"
        :type="props.action === 'archive' ? 'warning' : 'primary'"
        @click="emit('confirm')"
        >{{ actionLabel }}</ElButton
      ></template
    >
  </ElDialog>
</template>

<style scoped>
.dialog-description {
  margin: 0;
  color: var(--color-text);
  line-height: 24px;
}
</style>
