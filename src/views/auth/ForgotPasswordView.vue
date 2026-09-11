<script setup>
import { shallowRef } from 'vue'
import RecoveryConfirmation from '@/components/auth/RecoveryConfirmation.vue'
import RecoveryRequestForm from '@/components/auth/RecoveryRequestForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useI18n } from 'vue-i18n'

const requestedEmail = shallowRef('')
const { t } = useI18n()
</script>

<template>
  <AuthLayout :title="t('auth.recoverPassword')" :subtitle="t('auth.recoverSubtitle')">
    <RecoveryConfirmation v-if="requestedEmail" :email="requestedEmail" />
    <RecoveryRequestForm v-else @requested="requestedEmail = $event" />
  </AuthLayout>
</template>
