<script setup>
defineProps({
  message: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'error',
  },
})
</script>

<template>
  <ElAlert
    v-if="message"
    :title="message"
    :type="type"
    class="auth-alert"
    show-icon
    :closable="false"
  />
</template>

<style scoped>
.auth-alert {
  margin-bottom: 16px;
}
</style>
