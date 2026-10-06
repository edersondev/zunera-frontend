import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import IconPicker from '../IconPicker.vue'

const options = [
  { value: 'wallet', label: 'Wallet' },
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
]
const stubs = {
  ElPopover: {
    props: ['visible'],
    template: '<div><slot name="reference" /><div v-if="visible"><slot /></div></div>',
  },
  ElIcon: { template: '<i><slot /></i>' },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `<input v-bind="$attrs" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
  },
}

function picker(values = options, modelValue = 'wallet') {
  return mount(IconPicker, {
    props: { modelValue, options: values, label: 'Icon' },
    global: { stubs },
  })
}

describe('IconPicker', () => {
  it('shows selected value, supports arrow navigation and emits only its stored string', async () => {
    const wrapper = picker()
    const trigger = wrapper.get('.icon-picker-trigger')
    expect(trigger.attributes('aria-label')).toBe('Icon: Wallet')
    await trigger.trigger('click')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(3)
    expect(wrapper.get('[aria-selected="true"]').text()).toBe('Wallet')
    await wrapper.findAll('[role="option"]')[0].trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(wrapper.findAll('[role="option"]')[1].attributes('tabindex')).toBe('0')
    await wrapper.findAll('[role="option"]')[1].trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['bank']])
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('filters localized labels without accents and restores focus on Escape', async () => {
    const many = [
      ...Array.from({ length: 15 }, (_, index) => ({
        value: `icon_${index}`,
        label: `Icon ${index}`,
      })),
      { value: 'health', label: 'Saúde' },
    ]
    const wrapper = picker(many, 'icon_0')
    await wrapper.get('.icon-picker-trigger').trigger('click')
    await wrapper.get('input').setValue('saude')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(1)
    expect(wrapper.get('[role="option"]').text()).toBe('Saúde')
    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.get('.icon-picker-trigger').attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
