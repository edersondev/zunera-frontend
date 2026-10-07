<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import { ArrowDown, Check } from '@element-plus/icons-vue'
import { ElIcon, ElPopover } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { COLOR_VALUES, colorLabel, colorOptions, colorStyle } from '@/utils/colors/colorPalette'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  name: { type: String, default: undefined },
  testId: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const triggerRef = shallowRef(null)
const panelRef = shallowRef(null)
const isOpen = shallowRef(false)
const activeIndex = shallowRef(0)
const panelWidth = shallowRef(336)
const appendTarget = shallowRef('body')
const listboxId = useId()
const options = computed(() => colorOptions(t))
const selectedLabel = computed(() => colorLabel(props.modelValue, t) || '')
const selectedStyle = computed(() => colorStyle(props.modelValue))
const columns = computed(() => (panelWidth.value >= 320 ? 4 : panelWidth.value >= 200 ? 3 : 2))
let resizeObserver

function measure() {
  if (!triggerRef.value) return
  const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1
  const fieldWidth = triggerRef.value.getBoundingClientRect().width / zoom
  const viewportWidth = window.innerWidth / zoom
  const dialog = triggerRef.value.closest('.el-dialog')
  const dialogWidth = dialog ? dialog.getBoundingClientRect().width / zoom - 32 : Infinity
  panelWidth.value = Math.max(
    0,
    Math.min(Math.max(fieldWidth, 272), 336, viewportWidth - 32, dialogWidth),
  )
  appendTarget.value = dialog ?? 'body'
}

async function open() {
  if (props.disabled || isOpen.value) return
  measure()
  activeIndex.value = Math.max(0, COLOR_VALUES.indexOf(props.modelValue))
  isOpen.value = true
  await nextTick()
  requestAnimationFrame(() => {
    if (isOpen.value) focusOption(activeIndex.value)
  })
}

function close(restoreFocus = false) {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) nextTick(() => triggerRef.value?.focus())
}

function focusOption(index) {
  activeIndex.value = Math.max(0, Math.min(index, COLOR_VALUES.length - 1))
  nextTick(() => panelRef.value?.querySelectorAll('[role="option"]')[activeIndex.value]?.focus())
}

function choose(value) {
  emit('update:modelValue', value)
  close(true)
}

function onTriggerKeydown(event) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    open()
  }
}

function onOptionKeydown(event, index) {
  const moves = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: columns.value,
    ArrowUp: -columns.value,
  }
  if (Object.hasOwn(moves, event.key)) {
    event.preventDefault()
    event.stopPropagation()
    focusOption(index + moves[event.key])
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    focusOption(event.key === 'Home' ? 0 : COLOR_VALUES.length - 1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    choose(COLOR_VALUES[index])
  }
}

function onPanelKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close(true)
  }
}

function onDocumentPointerdown(event) {
  if (
    isOpen.value &&
    !triggerRef.value?.contains(event.target) &&
    !panelRef.value?.contains(event.target)
  )
    close()
}

function onDocumentFocusin(event) {
  if (
    isOpen.value &&
    !triggerRef.value?.contains(event.target) &&
    !panelRef.value?.contains(event.target)
  )
    close()
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close()
  },
)

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(triggerRef.value)
  }
  window.addEventListener('resize', measure)
  document.addEventListener('pointerdown', onDocumentPointerdown, true)
  document.addEventListener('focusin', onDocumentFocusin, true)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', measure)
  document.removeEventListener('pointerdown', onDocumentPointerdown, true)
  document.removeEventListener('focusin', onDocumentFocusin, true)
})
</script>

<template>
  <ElPopover
    :visible="isOpen"
    :width="panelWidth"
    :append-to="appendTarget"
    placement="bottom-start"
    :fallback-placements="['top-start', 'bottom-end', 'top-end']"
    :show-arrow="false"
    :offset="6"
    :popper-style="{
      maxWidth: 'calc(100vw - 32px)',
      padding: '12px',
      backgroundColor: 'var(--color-surface)',
      borderColor: 'var(--color-border)',
    }"
  >
    <template #reference>
      <button
        ref="triggerRef"
        type="button"
        class="color-picker-trigger"
        :name="name"
        :data-test="testId"
        :disabled="disabled"
        :aria-label="`${label}: ${selectedLabel}`"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        @click="isOpen ? close(true) : open()"
        @keydown="onTriggerKeydown"
      >
        <span class="color-picker-trigger__swatch" :style="selectedStyle" aria-hidden="true" />
        <span class="color-picker-trigger__label">{{ selectedLabel }}</span>
        <ElIcon
          class="color-picker-trigger__chevron"
          :class="{ 'is-open': isOpen }"
          aria-hidden="true"
        >
          <ArrowDown />
        </ElIcon>
      </button>
    </template>
    <div
      ref="panelRef"
      class="color-picker-panel"
      :class="{ 'is-compact': columns === 2 }"
      @keydown="onPanelKeydown"
    >
      <p class="color-picker-panel__heading">{{ t('colorPicker.choose') }}</p>
      <div
        :id="listboxId"
        class="color-picker-grid"
        role="listbox"
        :aria-label="label"
        :style="{ '--color-picker-columns': columns }"
      >
        <button
          v-for="(option, index) in options"
          :key="option.value"
          type="button"
          role="option"
          class="color-picker-option"
          :class="{ 'is-selected': option.value === modelValue }"
          :aria-label="option.label"
          :aria-selected="option.value === modelValue"
          :tabindex="index === activeIndex ? 0 : -1"
          @click="choose(option.value)"
          @focus="activeIndex = index"
          @keydown="onOptionKeydown($event, index)"
        >
          <span
            class="color-picker-option__swatch"
            :style="colorStyle(option.value)"
            aria-hidden="true"
          >
            <span v-if="option.value === modelValue" class="color-picker-option__check">
              <ElIcon><Check /></ElIcon>
            </span>
          </span>
          <span class="color-picker-option__tooltip" aria-hidden="true">{{ option.label }}</span>
        </button>
      </div>
      <p class="color-picker-panel__selected">
        {{ t('colorPicker.selected', { color: selectedLabel }) }}
      </p>
    </div>
  </ElPopover>
</template>

<style scoped>
.color-picker-trigger {
  display: flex;
  width: 100%;
  min-height: var(--el-component-size, 32px);
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 150ms,
    background-color 150ms;
}
.color-picker-trigger:hover {
  border-color: var(--color-border-strong);
}
.color-picker-trigger:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
.color-picker-trigger:disabled {
  cursor: not-allowed;
  color: var(--color-text-disabled);
}
.color-picker-trigger__swatch {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  border-radius: 50%;
}
.color-picker-trigger__label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.color-picker-trigger__chevron {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 14px;
  transition: transform 150ms;
}
.color-picker-trigger__chevron.is-open {
  transform: rotate(180deg);
}
.color-picker-panel {
  min-width: 0;
}
.color-picker-panel.is-compact {
  max-height: min(360px, calc(100dvh - 96px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-top: 24px;
}
.color-picker-panel__heading {
  margin: 0 0 8px;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}
.color-picker-grid {
  display: grid;
  grid-template-columns: repeat(var(--color-picker-columns), minmax(0, 1fr));
  gap: 4px;
}
.color-picker-option {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
}
.color-picker-option:hover {
  background: var(--color-surface-secondary);
}
.color-picker-option:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}
.color-picker-option__swatch {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition:
    transform 150ms,
    box-shadow 150ms;
}
.color-picker-option:hover .color-picker-option__swatch,
.color-picker-option:focus-visible .color-picker-option__swatch {
  transform: scale(1.08);
}
.color-picker-option.is-selected .color-picker-option__swatch {
  box-shadow:
    0 0 0 2px var(--color-surface),
    0 0 0 4px var(--color-action-primary);
}
.color-picker-option__check {
  display: flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
}
.color-picker-option__tooltip {
  position: absolute;
  z-index: 1;
  bottom: calc(100% + 4px);
  left: 50%;
  width: max-content;
  max-width: 180px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-secondary);
  color: var(--color-text);
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%);
}
.color-picker-option:hover .color-picker-option__tooltip,
.color-picker-option:focus-visible .color-picker-option__tooltip {
  opacity: 1;
  visibility: visible;
}
.color-picker-panel__selected {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}
@media (prefers-reduced-motion: reduce) {
  .color-picker-trigger,
  .color-picker-trigger__chevron,
  .color-picker-option__swatch {
    transition: none;
  }
}
</style>
