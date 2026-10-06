<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElIcon, ElInput, ElPopover } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { iconComponent } from '@/utils/icons/iconRegistry'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, required: true },
  label: { type: String, required: true },
  name: { type: String, default: undefined },
  testId: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const triggerRef = shallowRef(null)
const panelRef = shallowRef(null)
const searchRef = shallowRef(null)
const isOpen = shallowRef(false)
const query = shallowRef('')
const activeIndex = shallowRef(0)
const panelWidth = shallowRef(336)
const appendTarget = shallowRef('body')
const listboxId = useId()
const searchable = computed(() => props.options.length >= 16)
const selected = computed(
  () =>
    props.options.find((item) => item.value === props.modelValue) ?? {
      value: props.modelValue,
      label: props.modelValue,
      icon: iconComponent(props.modelValue),
    },
)
const filteredOptions = computed(() => {
  const search = normalize(query.value.trim())
  return search
    ? props.options.filter((item) => normalize(item.label).includes(search))
    : props.options
})
const columns = computed(() => (panelWidth.value >= 320 ? 4 : 3))
let resizeObserver

function normalize(value) {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function measure() {
  if (!triggerRef.value) return
  const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1
  const fieldWidth = triggerRef.value.getBoundingClientRect().width / zoom
  const viewportWidth = window.innerWidth / zoom
  panelWidth.value = Math.max(0, Math.min(Math.max(fieldWidth, 336), 400, viewportWidth - 32))
  appendTarget.value = triggerRef.value.closest('.el-dialog') ?? 'body'
}

async function open() {
  if (props.disabled || isOpen.value) return
  measure()
  query.value = ''
  activeIndex.value = Math.max(
    0,
    props.options.findIndex((item) => item.value === props.modelValue),
  )
  isOpen.value = true
  await nextTick()
  requestAnimationFrame(() => {
    if (!isOpen.value) return
    if (searchable.value) {
      panelRef.value
        ?.querySelectorAll('[role="option"]')
        [activeIndex.value]?.scrollIntoView?.({ block: 'nearest' })
      searchRef.value?.focus?.()
    } else focusOption(activeIndex.value)
  })
}

function close(restoreFocus = false) {
  if (!isOpen.value) return
  isOpen.value = false
  query.value = ''
  if (restoreFocus) nextTick(() => triggerRef.value?.focus())
}

function focusOption(index) {
  const count = filteredOptions.value.length
  if (!count) return
  activeIndex.value = Math.max(0, Math.min(index, count - 1))
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
  } else if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    event.stopPropagation()
    close(true)
  }
}

function onPanelKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close(true)
    return
  }
  if (event.target instanceof HTMLInputElement && event.key === 'ArrowDown') {
    event.preventDefault()
    focusOption(0)
  }
}

function onOptionKeydown(event, index) {
  const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns.value, ArrowUp: -columns.value }
  if (Object.hasOwn(moves, event.key)) {
    event.preventDefault()
    event.stopPropagation()
    focusOption(index + moves[event.key])
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    focusOption(event.key === 'Home' ? 0 : filteredOptions.value.length - 1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    choose(filteredOptions.value[index].value)
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

watch(query, () => {
  activeIndex.value = 0
})
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
        class="icon-picker-trigger"
        :name="name"
        :data-test="testId"
        :disabled="disabled"
        :aria-label="`${label}: ${selected.label}`"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        @click="isOpen ? close(true) : open()"
        @keydown="onTriggerKeydown"
      >
        <ElIcon class="icon-picker-trigger__icon" aria-hidden="true"
          ><component :is="selected.icon"
        /></ElIcon>
        <span class="icon-picker-trigger__label">{{ selected.label }}</span>
        <ElIcon class="icon-picker-trigger__chevron" aria-hidden="true"><ArrowDown /></ElIcon>
      </button>
    </template>
    <div ref="panelRef" class="icon-picker-panel" @keydown="onPanelKeydown">
      <ElInput
        v-if="searchable"
        ref="searchRef"
        v-model="query"
        class="icon-picker-search"
        :placeholder="t('iconPicker.search')"
        :aria-label="t('iconPicker.search')"
        clearable
      />
      <div
        :id="listboxId"
        class="icon-picker-grid"
        role="listbox"
        :aria-label="label"
        :style="{ '--icon-picker-columns': columns }"
      >
        <button
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          type="button"
          role="option"
          class="icon-picker-tile"
          :class="{ 'is-selected': option.value === modelValue }"
          :aria-selected="option.value === modelValue"
          :tabindex="index === activeIndex ? 0 : -1"
          :title="option.label"
          @click="choose(option.value)"
          @focus="activeIndex = index"
          @keydown="onOptionKeydown($event, index)"
        >
          <ElIcon class="icon-picker-tile__icon" aria-hidden="true"
            ><component :is="option.icon"
          /></ElIcon>
          <span class="icon-picker-tile__label">{{ option.label }}</span>
        </button>
        <p v-if="!filteredOptions.length" class="icon-picker-empty">
          {{ t('iconPicker.noResults') }}
        </p>
      </div>
    </div>
  </ElPopover>
</template>

<style scoped>
.icon-picker-trigger {
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
.icon-picker-trigger:hover {
  border-color: var(--color-border-strong);
}
.icon-picker-trigger:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
.icon-picker-trigger:disabled {
  cursor: not-allowed;
  color: var(--color-text-disabled);
}
.icon-picker-trigger__icon {
  flex: 0 0 auto;
  color: var(--color-action-primary);
  font-size: 18px;
}
.icon-picker-trigger__label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.icon-picker-trigger__chevron {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 14px;
}
.icon-picker-panel {
  min-width: 0;
}
.icon-picker-search {
  margin-bottom: 8px;
}
.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(var(--icon-picker-columns), minmax(0, 1fr));
  gap: 8px;
  max-height: min(312px, calc(100dvh - 120px));
  overflow-y: auto;
  overscroll-behavior: contain;
}
.icon-picker-tile {
  display: flex;
  min-width: 0;
  height: 80px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition:
    background-color 150ms,
    border-color 150ms,
    color 150ms;
}
.icon-picker-tile:hover {
  background: var(--color-surface-secondary);
}
.icon-picker-tile:focus-visible {
  outline: 2px solid var(--color-action-primary);
  outline-offset: -2px;
}
.icon-picker-tile.is-selected {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary-subtle);
}
.icon-picker-tile.is-selected .icon-picker-tile__icon {
  color: var(--color-action-primary);
}
.icon-picker-tile.is-selected .icon-picker-tile__label {
  color: var(--color-text);
}
.icon-picker-tile__icon {
  font-size: 23px;
}
.icon-picker-tile__label {
  max-width: 100%;
  overflow: hidden;
  color: var(--color-text-muted);
  max-height: 32px;
  font-size: 12px;
  line-height: 16px;
  overflow-wrap: anywhere;
  text-align: center;
}
.icon-picker-empty {
  grid-column: 1 / -1;
  margin: 8px 0;
  color: var(--color-text-muted);
  font-size: 12px;
  text-align: center;
}
</style>
