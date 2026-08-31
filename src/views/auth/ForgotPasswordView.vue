<script setup>
import { shallowRef } from 'vue'
import RecoveryConfirmation from '@/components/auth/RecoveryConfirmation.vue'
import RecoveryRequestForm from '@/components/auth/RecoveryRequestForm.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const requestedEmail = shallowRef('')
</script>

<template>
  <AuthLayout title="Recover password" subtitle="Get a secure recovery link without exposing account status.">
    <RecoveryConfirmation v-if="requestedEmail" :email="requestedEmail" />
    <RecoveryRequestForm v-else @requested="requestedEmail = $event" />
  </AuthLayout>
</template>
