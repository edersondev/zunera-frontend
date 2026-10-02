<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ActivationPanel from '@/components/auth/ActivationPanel.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const email = computed(() => route.query.email?.toString() ?? '')
const token = computed(() => route.query.token?.toString() ?? '')
const { t } = useI18n()
</script>

<template>
  <AuthLayout :title="t('auth.activateAccount')" :subtitle="t('auth.activationSubtitle')">
    <ActivationPanel :email="email" :token="token" />
  </AuthLayout>
</template>
