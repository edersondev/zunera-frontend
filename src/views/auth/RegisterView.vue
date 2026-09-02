<script setup>
import RegisterForm from '@/components/auth/RegisterForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
</script>

<template>
  <AuthLayout title="Create your account" subtitle="Start with secure email and password access.">
    <RegisterForm />
  </AuthLayout>
</template>
