import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CurrencyAmountInput from '../CurrencyAmountInput.vue'

const stubs = {
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}

describe('CurrencyAmountInput', () => {
  it('formats centavos for display and emits centavos from Brazilian input', async () => {
    const wrapper = mount(CurrencyAmountInput, {
      props: { modelValue: 1_250 },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.get('input').element.value).toBe('12,50')

    await wrapper.get('input').setValue('12,34')

    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([1_234])
  })

  it('keeps an empty amount as null', async () => {
    const wrapper = mount(CurrencyAmountInput, {
      props: { modelValue: 1_250 },
      global: { plugins: [i18n], stubs },
    })

    await wrapper.get('input').setValue('')

    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([null])
  })
})
