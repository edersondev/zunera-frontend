<script setup>
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  preset: {
    type: String,
    default: 'current_month',
  },
  from: {
    type: String,
    default: '',
  },
  to: {
    type: String,
    default: '',
  },
  rangeLabel: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select-preset', 'apply-custom'])
const { t } = useI18n()

const activePreset = shallowRef(props.preset)
const customFrom = shallowRef(props.from)
const customTo = shallowRef(props.to)

watch(
  () => props.preset,
  (value) => {
    activePreset.value = value
  },
)

watch(
  () => [props.from, props.to],
  ([from, to]) => {
    customFrom.value = from
    customTo.value = to
  },
)

const customRangeValid = computed(
  () => !customFrom.value || !customTo.value || customFrom.value <= customTo.value,
)
const canApplyCustom = computed(
  () => Boolean(customFrom.value && customTo.value) && customRangeValid.value,
)

function selectPreset(value) {
  activePreset.value = value
  emit('select-preset', value)
}

function applyCustom() {
  if (!canApplyCustom.value) return

  emit('apply-custom', { from: customFrom.value, to: customTo.value })
}
</script>

<template>
  <section class="period-selector" aria-labelledby="dashboard-period-title">
    <div class="period-heading">
      <h2 id="dashboard-period-title" class="section-title">{{ t('dashboard.period.label') }}</h2>
      <p class="period-range" data-test="dashboard-period-range">{{ rangeLabel }}</p>
    </div>

    <ElRadioGroup
      v-model="activePreset"
      class="period-presets"
      :disabled="loading"
      @change="selectPreset"
    >
      <ElRadioButton value="current_month" data-test="dashboard-period-current">
        {{ t('dashboard.period.currentMonth') }}
      </ElRadioButton>
      <ElRadioButton value="previous_month" data-test="dashboard-period-previous">
        {{ t('dashboard.period.previousMonth') }}
      </ElRadioButton>
      <ElRadioButton value="custom" data-test="dashboard-period-custom">
        {{ t('dashboard.period.custom') }}
      </ElRadioButton>
    </ElRadioGroup>

    <div
      v-if="activePreset === 'custom'"
      class="period-custom"
      data-test="dashboard-period-custom-fields"
    >
      <div class="period-field">
        <label class="period-label" for="dashboard-period-from">{{
          t('dashboard.period.from')
        }}</label>
        <ElDatePicker
          id="dashboard-period-from"
          v-model="customFrom"
          type="date"
          value-format="YYYY-MM-DD"
          :disabled="loading"
          :placeholder="t('dashboard.period.from')"
        />
      </div>
      <div class="period-field">
        <label class="period-label" for="dashboard-period-to">{{ t('dashboard.period.to') }}</label>
        <ElDatePicker
          id="dashboard-period-to"
          v-model="customTo"
          type="date"
          value-format="YYYY-MM-DD"
          :disabled="loading"
          :placeholder="t('dashboard.period.to')"
        />
      </div>
      <ElButton
        type="primary"
        data-test="dashboard-period-apply"
        :disabled="!canApplyCustom"
        :loading="loading"
        @click="applyCustom"
      >
        {{ t('dashboard.period.apply') }}
      </ElButton>
    </div>

    <p
      v-if="!customRangeValid"
      class="period-error"
      role="alert"
      data-test="dashboard-period-error"
    >
      {{ t('dashboard.period.invalidRange') }}
    </p>
  </section>
</template>

<style scoped>
.period-selector {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.period-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.section-title {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}

.period-range {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}

.period-custom {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.period-field {
  display: grid;
  gap: 4px;
}

.period-label {
  color: var(--color-text-subtle);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.period-error {
  margin: 0;
  color: var(--color-danger);
  font-size: 14px;
  line-height: 20px;
}

@media (max-width: 639px) {
  .period-custom {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
