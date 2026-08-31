<script setup>
import { computed, reactive, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AuthFormAlert from './AuthFormAlert.vue'
import PasswordRequirements from './PasswordRequirements.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'

const router = useRouter()
const sessionStore = useSessionStore()
const formRef = shallowRef(null)
const serverError = shallowRef(null)
const form = reactive({
  email: '',
  password: '',
  password_confirmation: '',
})
const rules = {
  email: [
    { required: true, message: 'Enter your email.', trigger: 'blur' },
    { type: 'email', message: 'Enter a valid email.', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Enter a password.', trigger: 'blur' },
    { min: 15, message: 'Use at least 15 characters.', trigger: 'blur' },
  ],
  password_confirmation: [
    { required: true, message: 'Confirm your password.', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('Passwords must match.'))
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
    return 'Password safety is temporarily unavailable. Try again soon.'
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
    <ElFormItem label="Email" prop="email" :error="serverError?.errors?.email?.[0]">
      <ElInput v-model="form.email" name="email" autocomplete="email" />
    </ElFormItem>
    <ElFormItem label="Password" prop="password" :error="serverError?.errors?.password?.[0]">
      <ElInput
        v-model="form.password"
        name="password"
        type="password"
        autocomplete="new-password"
        show-password
      />
    </ElFormItem>
    <PasswordRequirements />
    <ElFormItem label="Confirm password" prop="password_confirmation">
      <ElInput
        v-model="form.password_confirmation"
        name="password_confirmation"
        type="password"
        autocomplete="new-password"
        show-password
      />
    </ElFormItem>
    <ElButton class="auth-submit" native-type="submit" type="primary" :loading="sessionStore.loading">
      Create account
    </ElButton>
  </ElForm>
  <p class="form-switch">
    Already have an account?
    <RouterLink class="auth-link" :to="{ name: 'sign-in' }">Sign in</RouterLink>
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
