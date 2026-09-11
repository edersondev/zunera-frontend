<script setup>
import RegisterForm from '@/components/auth/RegisterForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <AuthLayout :title="t('auth.createAccountTitle')" :subtitle="t('auth.createAccountSubtitle')">
    <RegisterForm />
  </AuthLayout>
</template>
