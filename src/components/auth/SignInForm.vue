<script setup>
import { computed, reactive, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthFormAlert from './AuthFormAlert.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const formRef = shallowRef(null)
const serverError = shallowRef(null)
const form = reactive({
  email: '',
  password: '',
})
const rules = {
  email: [
    { required: true, message: 'Enter your email.', trigger: 'blur' },
    { type: 'email', message: 'Enter a valid email.', trigger: 'blur' },
  ],
  password: [{ required: true, message: 'Enter your password.', trigger: 'blur' }],
}

const alertMessage = computed(() => {
  if (route.query.expired) {
    return 'Your session expired. Sign in again to continue.'
  }

  if (serverError.value?.status === 429) {
    return 'Too many sign-in attempts. Recovery remains available.'
  }

  if (serverError.value?.status === 401) {
    return 'Email or password is incorrect.'
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
    <ElFormItem label="Email" prop="email" :error="serverError?.errors?.email?.[0]">
      <ElInput v-model="form.email" name="email" autocomplete="email" />
    </ElFormItem>
    <ElFormItem label="Password" prop="password">
      <ElInput
        v-model="form.password"
        name="password"
        type="password"
        autocomplete="current-password"
        show-password
      />
    </ElFormItem>
    <ElButton class="auth-submit" native-type="submit" type="primary" :loading="sessionStore.loading">
      Sign in
    </ElButton>
  </ElForm>
  <nav class="form-links" aria-label="Account options">
    <RouterLink class="auth-link" :to="{ name: 'forgot-password' }">Forgot password?</RouterLink>
    <RouterLink class="auth-link" :to="{ name: 'register' }">Create account</RouterLink>
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
