<script setup>
import { Close, Delete, FolderDelete } from '@element-plus/icons-vue'
import { computed, reactive, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, required: true, validator: (value) => ['archive', 'delete'].includes(value) },
  busy: { type: Boolean, default: false },
  error: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'closed'])
const { t } = useI18n()
const formRef = shallowRef(null)
const form = reactive({ current_password: '' })
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const isDelete = computed(() => props.mode === 'delete')
const rules = computed(() => ({
  current_password: [{ required: true, message: t('accountData.passwordRequired'), trigger: 'blur' }],
}))

watch(() => props.modelValue, (open) => {
  if (open) form.current_password = ''
})

async function submit() {
  if (props.busy) return
  if (isDelete.value) {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
  }
  emit('confirm', isDelete.value ? form.current_password : '')
}

function onClosed() {
  form.current_password = ''
  formRef.value?.clearValidate()
  emit('closed')
}
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="t(isDelete ? 'accountData.deleteTitle' : 'accountData.archiveTitle')"
    width="min(92vw, 520px)"
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    @closed="onClosed"
  >
    <p>{{ t(isDelete ? 'accountData.deleteDescription' : 'accountData.archiveDescription') }}</p>
    <ElAlert
      class="!mt-4"
      :type="isDelete ? 'error' : 'warning'"
      :title="t(isDelete ? 'accountData.deleteWarning' : 'accountData.archiveWarning')"
      :closable="false"
      show-icon
    />
    <ElForm v-if="isDelete" ref="formRef" :model="form" :rules="rules" label-position="top" class="password-form" @submit.prevent="submit">
      <ElFormItem :label="t('accountData.currentPassword')" prop="current_password" :error="error?.errors?.current_password?.[0]">
        <ElInput v-model="form.current_password" name="current_password" type="password" autocomplete="current-password" show-password :disabled="busy" />
      </ElFormItem>
    </ElForm>
    <ElAlert v-if="error?.message" class="action-error" type="error" :title="error.message" :closable="false" show-icon />
    <template #footer>
      <ElButton type="danger" :icon="Close" :disabled="busy" @click="visible = false">{{ t('common.cancel') }}</ElButton>
      <ElButton :type="isDelete ? 'danger' : 'primary'" :icon="isDelete ? Delete : FolderDelete" :loading="busy" @click="submit">
        {{ t(isDelete ? 'accountData.deleteAll' : 'accountData.archiveAll') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.password-form, .action-error { margin-top: 16px; }
</style>
