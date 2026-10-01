<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PasswordRequirements from '@/components/auth/PasswordRequirements.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'closed'])
const { t } = useI18n()
const sessionStore = useSessionStore()
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const formRef = shallowRef(null)
const form = reactive({ current_password: '', password: '', password_confirmation: '' })
const busy = shallowRef(false)
const error = shallowRef(null)
const success = shallowRef(false)
const rules = computed(() => ({
  current_password: [{ required: true, message: t('profile.currentPasswordRequired'), trigger: 'blur' }],
  password: [
    { required: true, message: t('auth.newPasswordRequired'), trigger: 'blur' },
    { min: 15, message: t('auth.passwordMin'), trigger: 'blur' },
  ],
  password_confirmation: [
    { required: true, message: t('auth.confirmNewPassword'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        callback(value === form.password ? undefined : new Error(t('auth.passwordsMatch')))
      },
      trigger: 'blur',
    },
  ],
}))

function clearFields() {
  form.current_password = ''
  form.password = ''
  form.password_confirmation = ''
  formRef.value?.clearValidate()
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  error.value = null
  success.value = false
  clearFields()
})

function onClosed() {
  error.value = null
  clearFields()
  emit('closed')
}

async function savePassword() {
  if (busy.value) return
  error.value = null
  success.value = false
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  busy.value = true
  try {
    await sessionStore.changeCurrentPassword({ ...form })
    clearFields()
    success.value = true
  } catch (requestError) {
    error.value = requestError
    clearFields()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="t('profile.changePassword')"
    width="min(92vw, 520px)"
    :close-on-click-modal="false"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    @closed="onClosed"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="savePassword">
      <ElFormItem :label="t('profile.currentPassword')" prop="current_password" :error="error?.errors?.current_password?.[0]">
        <ElInput v-model="form.current_password" name="current_password" type="password" autocomplete="current-password" show-password :disabled="busy" />
      </ElFormItem>
      <ElFormItem :label="t('profile.newPassword')" prop="password" :error="error?.errors?.password?.[0]">
        <ElInput v-model="form.password" name="password" type="password" autocomplete="new-password" show-password :disabled="busy" />
      </ElFormItem>
      <PasswordRequirements compact />
      <ElFormItem :label="t('auth.confirmNewPassword')" prop="password_confirmation" :error="error?.errors?.password_confirmation?.[0]">
        <ElInput v-model="form.password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" show-password :disabled="busy" />
      </ElFormItem>
      <ElAlert v-if="error?.message" type="error" :title="error.message" :closable="false" show-icon />
      <ElAlert v-if="success" type="success" :title="t('profile.passwordSaved')" :closable="false" show-icon />
      <div class="form-actions">
        <ElButton type="primary" native-type="submit" :loading="busy">{{ t('profile.savePassword') }}</ElButton>
      </div>
    </ElForm>
    <template #footer>
      <ElButton :disabled="busy" @click="visible = false">{{ t('profile.close') }}</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
