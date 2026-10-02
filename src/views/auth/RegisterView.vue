<script setup>
import { shallowRef } from 'vue'
import ActivationPending from '@/components/auth/ActivationPending.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const registeredEmail = shallowRef('')
</script>

<template>
  <AuthLayout :title="t('auth.createAccountTitle')" :subtitle="t('auth.createAccountSubtitle')">
    <ActivationPending v-if="registeredEmail" :email="registeredEmail" />
    <RegisterForm v-else @registered="registeredEmail = $event" />
  </AuthLayout>
</template>
