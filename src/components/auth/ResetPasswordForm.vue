<script setup>
import { computed, reactive, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AuthFormAlert from './AuthFormAlert.vue'
import PasswordRequirements from './PasswordRequirements.vue'
import RecoveryLinkState from './RecoveryLinkState.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'

const props = defineProps({
  email: {
    type: String,
    default: '',
  },
  token: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const sessionStore = useSessionStore()
const formRef = shallowRef(null)
const serverError = shallowRef(null)
const success = shallowRef('')
const form = reactive({
  email: props.email,
  token: props.token,
  password: '',
  password_confirmation: '',
})
const rules = {
  email: [
    { required: true, message: 'Enter your email.', trigger: 'blur' },
    { type: 'email', message: 'Enter a valid email.', trigger: 'blur' },
  ],
  token: [{ required: true, message: 'Recovery token is required.', trigger: 'blur' }],
  password: [
    { required: true, message: 'Enter a new password.', trigger: 'blur' },
    { min: 15, message: 'Use at least 15 characters.', trigger: 'blur' },
  ],
  password_confirmation: [
    { required: true, message: 'Confirm your new password.', trigger: 'blur' },
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
  success.value = ''
  await formRef.value?.validate()

  try {
    const response = await sessionStore.resetPassword({ ...form })
    form.password = ''
    form.password_confirmation = ''
    success.value = response.message
  } catch (error) {
    form.password = ''
    form.password_confirmation = ''
    serverError.value = error
  }
}
</script>

<template>
  <RecoveryLinkState :code="serverError?.code" />
  <AuthFormAlert :message="alertMessage" />
  <ElAlert v-if="success" class="success-alert" type="success" :title="success" show-icon :closable="false" />
  <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
    <ElFormItem label="Email" prop="email" :error="serverError?.errors?.email?.[0]">
      <ElInput v-model="form.email" name="email" autocomplete="email" />
    </ElFormItem>
    <ElFormItem label="Recovery token" prop="token">
      <ElInput v-model="form.token" name="token" autocomplete="off" />
    </ElFormItem>
    <ElFormItem label="New password" prop="password" :error="serverError?.errors?.password?.[0]">
      <ElInput
        v-model="form.password"
        name="password"
        type="password"
        autocomplete="new-password"
        show-password
      />
    </ElFormItem>
    <PasswordRequirements />
    <ElFormItem label="Confirm new password" prop="password_confirmation">
      <ElInput
        v-model="form.password_confirmation"
        name="password_confirmation"
        type="password"
        autocomplete="new-password"
        show-password
      />
    </ElFormItem>
    <ElButton class="auth-submit" native-type="submit" type="primary" :loading="sessionStore.loading">
      Reset password
    </ElButton>
  </ElForm>
  <p class="form-switch">
    <RouterLink class="auth-link" :to="{ name: 'sign-in' }">Return to sign in</RouterLink>
    <ElButton v-if="success" link type="primary" @click="router.push({ name: 'sign-in' })">Sign in now</ElButton>
  </p>
</template>

<style scoped>
.auth-submit {
  width: 100%;
  min-height: 44px;
}

.success-alert {
  margin-bottom: 16px;
}

.form-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 20px 0 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}
</style>
