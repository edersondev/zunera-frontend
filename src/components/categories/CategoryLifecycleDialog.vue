<script setup>
import { computed } from 'vue'
import { Close, FolderDelete, RefreshLeft } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

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
const { t } = useI18n()
const title = computed(() => (props.action === 'archive' ? t('categories.archiveTitle') : t('categories.restoreTitle')))
const actionLabel = computed(() =>
  props.action === 'archive' ? t('categories.archive') : t('categories.restore'),
)
const actionIcon = computed(() => (props.action === 'archive' ? FolderDelete : RefreshLeft))
const description = computed(() =>
  props.category
    ? props.action === 'archive'
      ? t('categories.archiveDescription', { name: props.category.name })
      : t('categories.restoreDescription', { name: props.category.name })
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
      ><ElButton
        :icon="Close"
        type="danger"
        :disabled="props.loading"
        @click="emit('update:visible', false)"
        >{{ t('common.cancel') }}</ElButton
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
