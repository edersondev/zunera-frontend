<script setup>
import { computed, reactive, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { resendAccountActivation } from '@/services/authService'
import { showActionSuccess } from '@/services/actionMessage'
import AuthFormAlert from './AuthFormAlert.vue'

const props = defineProps({
  initialEmail: { type: String, default: '' },
})

const { t } = useI18n()
const formRef = shallowRef(null)
const loading = shallowRef(false)
const serverError = shallowRef(null)
const form = reactive({ email: props.initialEmail })
const rules = computed(() => ({
  email: [
    { required: true, message: t('auth.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' },
  ],
}))

async function submit() {
  serverError.value = null
  await formRef.value?.validate()
  loading.value = true

  try {
    await resendAccountActivation({ email: form.email })
    showActionSuccess(t('auth.activationResent'))
  } catch (error) {
    serverError.value = error
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="resend-section" :aria-label="t('auth.resendActivation')">
    <p class="resend-hint">{{ t('auth.resendHint') }}</p>
    <AuthFormAlert :message="serverError?.message" />
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
      <ElFormItem :label="t('common.email')" prop="email" :error="serverError?.errors?.email?.[0]">
        <ElInput v-model="form.email" name="email" autocomplete="email" />
      </ElFormItem>
      <ElButton class="resend-submit" native-type="submit" type="primary" :loading="loading">
        {{ t('auth.resendActivation') }}
      </ElButton>
    </ElForm>
  </section>
</template>

<style scoped>
.resend-section {
  margin-top: 20px;
}

.resend-hint {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.resend-submit {
  width: 100%;
  min-height: 44px;
}
</style>
