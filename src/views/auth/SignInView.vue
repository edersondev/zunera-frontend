<script setup>
import SignInForm from '@/components/auth/SignInForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
</script>

<template>
  <AuthLayout title="Sign in" subtitle="Access your Zunera account securely.">
    <SignInForm />
  </AuthLayout>
</template>
