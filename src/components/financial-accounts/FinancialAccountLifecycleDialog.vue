<script setup>
import { computed } from 'vue'
import { Close, FolderDelete, RefreshLeft } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

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
const { t } = useI18n()

const title = computed(() => (props.action === 'archive' ? t('financialAccounts.archiveTitle') : t('financialAccounts.restoreTitle')))
const actionLabel = computed(() =>
  props.action === 'archive' ? t('financialAccounts.archiveTitle') : t('financialAccounts.restoreTitle'),
)
const actionIcon = computed(() => (props.action === 'archive' ? FolderDelete : RefreshLeft))
const description = computed(() => {
  if (!props.account) {
    return ''
  }

  return props.action === 'archive'
    ? t('financialAccounts.archiveDescription', { name: props.account.name })
    : t('financialAccounts.restoreDescription', { name: props.account.name })
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
        {{ t('common.cancel') }}
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
