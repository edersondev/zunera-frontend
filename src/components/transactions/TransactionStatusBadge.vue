<script setup>
import { computed } from 'vue'
import { CircleCheck, Clock } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  status: { type: String, required: true },
})

const { t } = useI18n()
const presentation = computed(() =>
  props.status === 'pending'
    ? { type: 'warning', icon: Clock }
    : { type: 'success', icon: CircleCheck },
)
</script>

<template>
  <ElTag
    :type="presentation.type"
    size="small"
    effect="light"
    class="status-badge"
    :data-test="`transaction-status-${status}`"
  >
    <ElIcon aria-hidden="true"><component :is="presentation.icon" /></ElIcon>
    <span>{{ t(`transactions.${status}`) }}</span>
  </ElTag>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
