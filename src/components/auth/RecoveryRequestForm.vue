<script setup>
import { reactive, shallowRef } from 'vue'
import AuthFormAlert from './AuthFormAlert.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'

const emit = defineEmits(['requested'])
const sessionStore = useSessionStore()
const formRef = shallowRef(null)
const serverError = shallowRef(null)
const form = reactive({ email: '' })
const rules = {
  email: [
    { required: true, message: 'Enter your email.', trigger: 'blur' },
    { type: 'email', message: 'Enter a valid email.', trigger: 'blur' },
  ],
}

async function submit() {
  serverError.value = null
  await formRef.value?.validate()

  try {
    await sessionStore.requestPasswordRecovery({ ...form })
    emit('requested', form.email)
  } catch (error) {
    serverError.value = error
  }
}
</script>

<template>
  <AuthFormAlert :message="serverError?.message" />
  <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
    <ElFormItem label="Email" prop="email" :error="serverError?.errors?.email?.[0]">
      <ElInput v-model="form.email" name="email" autocomplete="email" />
    </ElFormItem>
    <ElButton class="auth-submit" native-type="submit" type="primary" :loading="sessionStore.loading">
      Send recovery instructions
    </ElButton>
  </ElForm>
</template>

<style scoped>
.auth-submit {
  width: 100%;
  min-height: 44px;
}
</style>
