<script setup>
import { computed, reactive, shallowRef } from 'vue'
import AuthFormAlert from './AuthFormAlert.vue'
import { useSessionStore } from '@/stores/auth/sessionStore'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['requested'])
const sessionStore = useSessionStore()
const { t } = useI18n()
const formRef = shallowRef(null)
const serverError = shallowRef(null)
const form = reactive({ email: '' })
const rules = computed(() => ({
  email: [
    { required: true, message: t('auth.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' },
  ],
}))

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
    <ElFormItem :label="t('common.email')" prop="email" :error="serverError?.errors?.email?.[0]">
      <ElInput v-model="form.email" name="email" autocomplete="email" />
    </ElFormItem>
    <ElButton class="auth-submit" native-type="submit" type="primary" :loading="sessionStore.loading">
      {{ t('auth.sendRecovery') }}
    </ElButton>
  </ElForm>
</template>

<style scoped>
.auth-submit {
  width: 100%;
  min-height: 44px;
}
</style>
