<script setup>
import { onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { confirmAccountActivation } from '@/services/authService'
import ResendActivationForm from './ResendActivationForm.vue'

const props = defineProps({
  email: { type: String, default: '' },
  token: { type: String, default: '' },
})

const router = useRouter()
const { t } = useI18n()
const status = shallowRef(props.token && props.email ? 'loading' : 'invalid')
const activationToken = props.token
const activationEmail = props.email

async function confirm() {
  if (!activationToken || !activationEmail) {
    status.value = 'invalid'
    return
  }

  status.value = 'loading'

  try {
    await confirmAccountActivation({ email: activationEmail, token: activationToken })
    status.value = 'success'
  } catch (error) {
    status.value = error.code === 'activation_link_expired'
      ? 'expired'
      : error.status === 0 || error.status >= 500
        ? 'unavailable'
        : 'invalid'
  }
}

onMounted(async () => {
  if (activationToken && activationEmail) {
    await router.replace({ name: 'activate-account', query: { email: activationEmail } })
    await confirm()
  }
})
</script>

<template>
  <ElAlert v-if="status === 'loading'" type="info" :title="t('auth.activationWorking')" show-icon />
  <ElAlert v-else-if="status === 'success'" type="success" :title="t('auth.activationSuccess')" show-icon />
  <ElAlert v-else-if="status === 'expired'" type="warning" :title="t('auth.activationExpired')" show-icon />
  <ElAlert v-else-if="status === 'unavailable'" type="error" :title="t('auth.activationUnavailable')" show-icon />
  <ElAlert v-else type="warning" :title="t('auth.activationInvalid')" show-icon />

  <ElButton v-if="status === 'unavailable'" class="activation-action" @click="confirm">
    {{ t('common.retry') }}
  </ElButton>
  <ResendActivationForm v-if="status === 'expired' || status === 'invalid'" :initial-email="activationEmail" />
  <RouterLink v-if="status !== 'loading'" class="auth-link sign-in-link" :to="{ name: 'sign-in' }">
    {{ t('auth.returnToSignIn') }}
  </RouterLink>
</template>

<style scoped>
.activation-action,
.sign-in-link {
  display: inline-block;
  margin-top: 16px;
}
</style>
