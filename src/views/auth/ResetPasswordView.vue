<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const route = useRoute()
const email = computed(() => route.query.email?.toString() ?? '')
const token = computed(() => route.query.token?.toString() ?? '')
</script>

<template>
  <AuthLayout title="Reset password" subtitle="Use the newest recovery link and choose a new password.">
    <ResetPasswordForm :email="email" :token="token" />
  </AuthLayout>
</template>
