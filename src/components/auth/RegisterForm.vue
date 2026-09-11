<script setup>
import { computed, reactive, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AuthFormAlert from './AuthFormAlert.vue'
import PasswordRequirements from './PasswordRequirements.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const sessionStore = useSessionStore()
const { t } = useI18n()
const formRef = shallowRef(null)
const serverError = shallowRef(null)
const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const rules = {
  name: [
    { required: true, message: t('auth.nameRequired'), trigger: 'blur' },
    { min: 2, message: t('auth.nameShort'), trigger: 'blur' },
  ],
  email: [
    { required: true, message: t('auth.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('auth.passwordRequired'), trigger: 'blur' },
    { min: 15, message: t('auth.passwordMin'), trigger: 'blur' },
  ],
  password_confirmation: [
    { required: true, message: t('auth.confirmPassword'), trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error(t('auth.passwordsMatch')))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

const alertMessage = computed(() => {
  if (serverError.value?.code === 'password_safety_unavailable') {
    return t('auth.safetyUnavailable')
  }

  return serverError.value?.message ?? ''
})

async function submit() {
  serverError.value = null
  await formRef.value?.validate()

  try {
    await sessionStore.register({ ...form })
    await router.push({ name: 'protected-home' })
  } catch (error) {
    serverError.value = error
  }
}
</script>

<template>
  <AuthFormAlert :message="alertMessage" />
  <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
    <ElFormItem :label="t('auth.fullName')" prop="name" :error="serverError?.errors?.name?.[0]">
      <ElInput v-model="form.name" name="name" autocomplete="name" />
    </ElFormItem>
    <ElFormItem :label="t('common.email')" prop="email" :error="serverError?.errors?.email?.[0]">
      <ElInput v-model="form.email" name="email" autocomplete="email" />
    </ElFormItem>
    <ElFormItem :label="t('common.password')" prop="password" :error="serverError?.errors?.password?.[0]">
      <ElInput
        v-model="form.password"
        name="password"
        type="password"
        autocomplete="new-password"
        show-password
      />
    </ElFormItem>
    <PasswordRequirements />
    <ElFormItem :label="t('auth.confirmPassword')" prop="password_confirmation">
      <ElInput
        v-model="form.password_confirmation"
        name="password_confirmation"
        type="password"
        autocomplete="new-password"
        show-password
      />
    </ElFormItem>
    <ElButton class="auth-submit" native-type="submit" type="primary" :loading="sessionStore.loading">
      {{ t('auth.createAccount') }}
    </ElButton>
  </ElForm>
  <p class="form-switch">
    {{ t('auth.alreadyHaveAccount') }}
    <RouterLink class="auth-link" :to="{ name: 'sign-in' }">{{ t('common.signIn') }}</RouterLink>
  </p>
</template>

<style scoped>
.auth-submit {
  width: 100%;
  min-height: 44px;
}

.form-switch {
  margin: 20px 0 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}
</style>
