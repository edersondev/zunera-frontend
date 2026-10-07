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

function picker(value = 'cyan') {
  i18n.global.locale.value = 'pt-BR'
  return mount(ColorPicker, {
    props: { modelValue: value, label: 'Cor' },
    global: { plugins: [i18n], stubs },
  })
}

describe('ColorPicker', () => {
  it('shows a legacy color as its mapped selection without changing the saved value', async () => {
    const wrapper = picker('rose')
    const trigger = wrapper.get('.color-picker-trigger')
    expect(trigger.attributes('aria-label')).toBe('Cor: Rosa')
    expect(wrapper.get('.color-picker-trigger__swatch').attributes('style')).toContain(
      'var(--palette-pink)',
    )
    await trigger.trigger('click')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(10)
    expect(wrapper.get('[aria-selected="true"]').attributes('aria-label')).toBe('Rosa')
    expect(wrapper.get('[aria-selected="true"] .color-picker-option__check').exists()).toBe(true)
    expect(wrapper.text()).toContain('Selecionada: Rosa')
    await wrapper.get('.color-picker-panel').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('uses arrows and Space to emit a new semantic value, then closes', async () => {
    const wrapper = picker('blue')
    await wrapper.get('.color-picker-trigger').trigger('click')
    await wrapper.findAll('[role="option"]')[0].trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(wrapper.findAll('[role="option"]')[1].attributes('tabindex')).toBe('0')
    await wrapper.findAll('[role="option"]')[1].trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['violet']])
    expect(wrapper.get('.color-picker-trigger').attributes('aria-expanded')).toBe('false')
  })

  it('uses five columns on normal widths and two at very narrow widths', async () => {
    const normal = picker()
    await normal.get('.color-picker-trigger').trigger('click')
    expect(normal.get('.color-picker-grid').attributes('style')).toContain(
      '--color-picker-columns: 5',
    )
    normal.unmount()

    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 180 })
    try {
      const narrow = picker()
      await narrow.get('.color-picker-trigger').trigger('click')
      expect(narrow.get('.color-picker-grid').attributes('style')).toContain(
        '--color-picker-columns: 2',
      )
      narrow.unmount()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('localizes the new option labels and tooltips', async () => {
    const wrapper = picker('pink')
    await wrapper.get('.color-picker-trigger').trigger('click')
    expect(wrapper.get('[aria-label="Rosa"] .color-picker-option__tooltip').text()).toBe('Rosa')
    expect(wrapper.get('[aria-label="Amarelo"] .color-picker-option__tooltip').text()).toBe(
      'Amarelo',
    )
    i18n.global.locale.value = 'en'
    await nextTick()
    expect(wrapper.get('.color-picker-trigger').attributes('aria-label')).toBe('Cor: Pink')
    expect(wrapper.get('[aria-label="Pink"] .color-picker-option__tooltip').text()).toBe('Pink')
    i18n.global.locale.value = 'pt-BR'
  })
})
