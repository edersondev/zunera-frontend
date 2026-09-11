<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const email = computed(() => route.query.email?.toString() ?? '')
const token = computed(() => route.query.token?.toString() ?? '')
const { t } = useI18n()
</script>

<template>
  <AuthLayout :title="t('auth.resetPassword')" :subtitle="t('auth.resetSubtitle')">
    <ResetPasswordForm :email="email" :token="token" />
  </AuthLayout>
</template>
