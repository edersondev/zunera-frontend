<script setup>
defineProps({
  email: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <ElAlert
    class="recovery-confirmation"
    type="success"
    title="Check your email"
    description="If an account exists for that email, recovery instructions will arrive shortly."
    show-icon
  />
  <p class="confirmation-email">{{ email }}</p>
  <RouterLink class="auth-link" :to="{ name: 'sign-in' }">Return to sign in</RouterLink>
</template>

<style scoped>
.recovery-confirmation {
  margin-bottom: 16px;
}

.confirmation-email {
  margin: 0 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
