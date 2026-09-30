<script setup>
import { useI18n } from 'vue-i18n'
import { InfoFilled } from '@element-plus/icons-vue'
import NotificationSourceIcon from './NotificationSourceIcon.vue'

defineProps({
  preferences: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  updatingCategory: { type: String, default: null },
  error: { type: Boolean, default: false },
})
const emit = defineEmits(['change', 'retry'])
const { t } = useI18n()
const categories = ['credit_cards', 'recurring_transactions', 'budgets', 'financial_goals']
</script>

<template>
  <section class="notification-preferences" :aria-label="t('notifications.preferences.title')">
    <p class="preferences-intro">{{ t('notifications.preferences.description') }}</p>
    <ElAlert v-if="error" type="warning" :closable="false" :title="t('notifications.preferences.error')">
      <ElButton text @click="emit('retry')">{{ t('notifications.preferences.retry') }}</ElButton>
    </ElAlert>
    <div class="preference-list">
      <div v-for="category in categories" :key="category" class="preference-row">
        <NotificationSourceIcon :source="category" />
        <div class="preference-copy">
          <span :id="`notification-preference-${category}`" class="preference-name">{{ t(`notifications.preferences.${category}`) }}</span>
          <span class="preference-description">{{ t(`notifications.preferences.details.${category}`) }}</span>
        </div>
        <ElSwitch
          :model-value="preferences[category]"
          :aria-label="t(`notifications.preferences.${category}`)"
          :aria-labelledby="`notification-preference-${category}`"
          :disabled="loading || Boolean(updatingCategory)"
          @change="emit('change', category, $event)"
        />
      </div>
    </div>
    <p class="critical-note"><ElIcon aria-hidden="true"><InfoFilled /></ElIcon><span>{{ t('notifications.preferences.critical') }}</span></p>
  </section>
</template>

<style scoped>
.notification-preferences { display: grid; gap: 18px; }
.preferences-intro { margin: 0; color: var(--color-text-subtle); font-size: 14px; line-height: 21px; }
.preference-list { border-top: 1px solid var(--color-border); }
.preference-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--color-border); }
.preference-copy { display: grid; min-width: 0; flex: 1; gap: 3px; }
.preference-name { color: var(--color-text); font-size: 14px; font-weight: 600; }
.preference-description { color: var(--color-text-muted); font-size: 12px; line-height: 18px; }
.critical-note { display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 11px 12px; border-radius: var(--radius-md); background: var(--color-surface-secondary); color: var(--color-text-subtle); font-size: 13px; line-height: 19px; }
.critical-note .el-icon { flex: none; margin-top: 2px; color: var(--color-info); }
</style>
