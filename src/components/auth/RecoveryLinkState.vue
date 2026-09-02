<script setup>
defineProps({
  code: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <ElAlert
    v-if="code === 'recovery_link_expired'"
    class="link-state"
    type="warning"
    title="Recovery link expired"
    description="Request a new recovery link to reset your password."
    show-icon
    :closable="false"
  />
  <ElAlert
    v-else-if="code === 'recovery_link_invalid'"
    class="link-state"
    type="error"
    title="Recovery link invalid"
    description="Use the newest recovery email or request a new link."
    show-icon
    :closable="false"
  />
</template>

<style scoped>
.link-state {
  margin-bottom: 16px;
}
</style>
