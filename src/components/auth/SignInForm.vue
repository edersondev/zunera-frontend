<script setup>
import { computed, reactive, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthFormAlert from './AuthFormAlert.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const { t } = useI18n()
const formRef = shallowRef(null)
const serverError = shallowRef(null)
const form = reactive({
  email: '',
  password: '',
})
const rules = computed(() => ({
  email: [
    { required: true, message: t('auth.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' },
  ],
  password: [{ required: true, message: t('auth.passwordRequired'), trigger: 'blur' }],
}))

const alertMessage = computed(() => {
  if (route.query.expired) {
    return t('auth.sessionExpired')
  }

  if (serverError.value?.status === 429) {
    return t('auth.tooManyAttempts')
  }

  if (serverError.value?.status === 401) {
    return t('auth.invalidCredentials')
  }

  return serverError.value?.message ?? ''
})

async function submit() {
  serverError.value = null
  await formRef.value?.validate()

  try {
    await sessionStore.login({ ...form })
    form.password = ''
    await router.push(route.query.redirect?.toString() || { name: 'protected-home' })
  } catch (error) {
    form.password = ''
    serverError.value = error
  }
}
</script>

<template>
  <AuthFormAlert :message="alertMessage" :type="route.query.expired ? 'warning' : 'error'" />
  <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
    <ElFormItem :label="t('common.email')" prop="email" :error="serverError?.errors?.email?.[0]">
      <ElInput v-model="form.email" name="email" autocomplete="email" />
    </ElFormItem>
    <ElFormItem :label="t('common.password')" prop="password">
      <ElInput
        v-model="form.password"
        name="password"
        type="password"
        autocomplete="current-password"
        show-password
      />
    </ElFormItem>
    <ElButton class="auth-submit" native-type="submit" type="primary" :loading="sessionStore.loading">
      {{ t('common.signIn') }}
    </ElButton>
  </ElForm>
  <nav class="form-links" :aria-label="t('auth.accountOptions')">
    <RouterLink class="auth-link" :to="{ name: 'forgot-password' }">{{ t('auth.forgotPassword') }}</RouterLink>
    <RouterLink class="auth-link" :to="{ name: 'register' }">{{ t('auth.createAccount') }}</RouterLink>
  </nav>
</template>

<style scoped>
.auth-submit {
  width: 100%;
  min-height: 44px;
}

.form-links {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  font-size: 14px;
  line-height: 20px;
}
</style>
