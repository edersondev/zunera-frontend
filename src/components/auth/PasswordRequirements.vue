<script setup>
defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <p class="password-help" :class="{ 'password-help-compact': compact }">
    Use 15 to 64 characters. Spaces are allowed. Avoid common or compromised passwords.
  </p>
</template>

<style scoped>
.password-help {
  margin: -8px 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.password-help-compact {
  margin-bottom: 8px;
}
</style>
