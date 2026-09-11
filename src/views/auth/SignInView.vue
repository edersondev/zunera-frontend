<script setup>
import SignInForm from '@/components/auth/SignInForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <AuthLayout :title="t('common.signIn')" :subtitle="t('auth.signInSubtitle')">
    <SignInForm />
  </AuthLayout>
</template>
