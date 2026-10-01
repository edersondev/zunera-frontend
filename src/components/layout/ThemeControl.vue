<script setup>
import { Check, Monitor, Moon, Sunny } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const { preference, setTheme } = useTheme()
const choices = [
  { value: 'light', label: 'app.themeLight', icon: Sunny },
  { value: 'dark', label: 'app.themeDark', icon: Moon },
  { value: 'system', label: 'app.themeSystem', icon: Monitor },
]
const activeIcon = computed(() => choices.find((choice) => choice.value === preference.value)?.icon ?? Monitor)
const accessibleLabel = computed(() => t('app.themeControl', {
  mode: t(choices.find((choice) => choice.value === preference.value)?.label ?? 'app.themeSystem'),
}))
</script>

<template>
  <ElDropdown trigger="click" @command="setTheme">
    <ElButton class="theme-trigger" text :aria-label="accessibleLabel">
      <ElIcon aria-hidden="true"><component :is="activeIcon" /></ElIcon>
    </ElButton>
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem v-for="choice in choices" :key="choice.value" :command="choice.value">
          <ElIcon aria-hidden="true"><component :is="choice.icon" /></ElIcon>
          <span>{{ t(choice.label) }}</span>
          <ElIcon v-if="preference === choice.value" class="selected-check" aria-hidden="true"><Check /></ElIcon>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<style scoped>
.theme-trigger {
  width: 44px;
  height: 44px;
  color: var(--color-text);
}

.selected-check {
  margin-left: 8px;
  color: var(--color-action-primary);
}
</style>
