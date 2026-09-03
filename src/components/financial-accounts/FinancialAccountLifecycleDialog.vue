<script setup>
import { computed } from 'vue'
import { Close, FolderDelete, RefreshLeft } from '@element-plus/icons-vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  account: {
    type: Object,
    default: null,
  },
  action: {
    type: String,
    validator: (value) => ['archive', 'restore'].includes(value),
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

const title = computed(() => (props.action === 'archive' ? 'Archive account' : 'Restore account'))
const actionLabel = computed(() =>
  props.action === 'archive' ? 'Archive account' : 'Restore account',
)
const actionIcon = computed(() => (props.action === 'archive' ? FolderDelete : RefreshLeft))
const description = computed(() => {
  if (!props.account) {
    return ''
  }

  return props.action === 'archive'
    ? `Archive "${props.account.name}"? It will be removed from active account choices and the active balance.`
    : `Restore "${props.account.name}"? It will become active again.`
})
</script>

<template>
  <ElDialog
    :model-value="props.visible"
    :title="title"
    width="min(92vw, 480px)"
    @update:model-value="emit('update:visible', $event)"
    @closed="emit('cancel')"
  >
    <p v-if="description" class="dialog-description">{{ description }}</p>
    <template #footer>
      <ElButton :icon="Close" type="danger" @click="emit('update:visible', false)">
        Cancel
      </ElButton>
      <ElButton
        :icon="actionIcon"
        :type="props.action === 'archive' ? 'warning' : 'primary'"
        :loading="props.loading"
        @click="emit('confirm')"
      >
        {{ actionLabel }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.dialog-description {
  margin: 0;
  color: var(--color-text);
  line-height: 24px;
}
</style>
