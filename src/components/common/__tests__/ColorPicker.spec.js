import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { i18n } from '@/i18n'
import ColorPicker from '../ColorPicker.vue'

const stubs = {
  ElPopover: {
    props: ['visible'],
    template: '<div><slot name="reference" /><div v-if="visible"><slot /></div></div>',
  },
  ElIcon: { template: '<i><slot /></i>' },
}

function picker(value = 'teal') {
  i18n.global.locale.value = 'pt-BR'
  return mount(ColorPicker, {
    props: { modelValue: value, label: 'Cor' },
    global: { plugins: [i18n], stubs },
  })
}

describe('ColorPicker', () => {
  it('shows the saved color in its closed field and marks it in the visual palette', async () => {
    const wrapper = picker('rose')
    const trigger = wrapper.get('.color-picker-trigger')
    expect(trigger.attributes('aria-label')).toBe('Cor: Rosa')
    expect(wrapper.get('.color-picker-trigger__swatch').attributes('style')).toContain(
      'var(--palette-rose)',
    )
    await trigger.trigger('click')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(16)
    expect(wrapper.get('[aria-selected="true"]').attributes('aria-label')).toBe('Rosa')
    expect(wrapper.get('[aria-selected="true"] .color-picker-option__check').exists()).toBe(true)
    expect(wrapper.text()).toContain('Selecionada: Rosa')
  })

  it('uses arrows and Space to emit a semantic value, then closes', async () => {
    const wrapper = picker()
    await wrapper.get('.color-picker-trigger').trigger('click')
    await wrapper.findAll('[role="option"]')[0].trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(wrapper.findAll('[role="option"]')[1].attributes('tabindex')).toBe('0')
    await wrapper.findAll('[role="option"]')[1].trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['blue']])
    expect(wrapper.get('.color-picker-trigger').attributes('aria-expanded')).toBe('false')
  })

  it('uses two columns when the available width cannot fit three touch targets', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 180 })
    try {
      const wrapper = picker()
      await wrapper.get('.color-picker-trigger').trigger('click')
      expect(wrapper.get('.color-picker-grid').attributes('style')).toContain(
        '--color-picker-columns: 2',
      )
      wrapper.unmount()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('closes on Escape without changing the value', async () => {
    const wrapper = picker('amber')
    await wrapper.get('.color-picker-trigger').trigger('click')
    await wrapper.get('.color-picker-panel').trigger('keydown', { key: 'Escape' })
    expect(wrapper.get('.color-picker-trigger').attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('localizes option labels and tooltips', async () => {
    const wrapper = picker('pink')
    await wrapper.get('.color-picker-trigger').trigger('click')
    expect(wrapper.get('[aria-label="Rosa-claro"] .color-picker-option__tooltip').text()).toBe(
      'Rosa-claro',
    )
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(wrapper.get('.color-picker-trigger').attributes('aria-label')).toBe('Cor: Pink')
    expect(wrapper.get('[aria-label="Pink"] .color-picker-option__tooltip').text()).toBe('Pink')
    i18n.global.locale.value = 'pt-BR'
  })
})
