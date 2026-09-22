import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardForm from '../CreditCardForm.vue'

const stubs = {
  ElDialog: {
    props: ['modelValue', 'title'],
    template:
      '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>',
  },
  ElForm: { template: '<form><slot /></form>', methods: { clearValidate: vi.fn() } },
  ElFormItem: {
    props: ['label', 'error'],
    template: '<label :data-error="error"><span>{{ label }}</span><slot /></label>',
  },
  ElRow: {
    props: ['gutter'],
    template: '<div class="credit-card-form-row" :data-gutter="gutter"><slot /></div>',
  },
  ElCol: {
    props: ['xs', 'md'],
    template: '<div class="credit-card-form-column" :data-xs="xs" :data-md="md"><slot /></div>',
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'input'],
    template:
      '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'input\', $event.target.value)" />',
  },
  ElInputNumber: { template: '<input v-bind="$attrs" type="number" />' },
  ElSelect: { template: '<select v-bind="$attrs"><slot /></select>' },
  ElOption: { template: '<option><slot /></option>' },
  ElButton: {
    props: ['icon'],
    template: '<button :data-icon="icon?.name"><slot /></button>',
  },
  CurrencyAmountInput: { template: '<input v-bind="$attrs" />' },
}

describe('CreditCardForm', () => {
  it('uses two field columns from the medium breakpoint and a single column below it', () => {
    const wrapper = mount(CreditCardForm, {
      props: { visible: true },
      global: { plugins: [i18n], stubs },
    })

    const rows = wrapper.findAll('.credit-card-form-row')

    expect(rows).toHaveLength(4)
    expect(rows[0].find('[data-test="credit-card-name"]').exists()).toBe(true)
    expect(rows[0].find('[data-test="credit-card-institution"]').exists()).toBe(true)

    for (const row of rows) {
      const columns = row.findAll('.credit-card-form-column')

      expect(columns).toHaveLength(2)
      expect(columns.map((column) => column.attributes('data-xs'))).toEqual(['24', '24'])
      expect(columns.map((column) => column.attributes('data-md'))).toEqual(['12', '12'])
    }
  })

  it('adds icons to its labelled actions', () => {
    const wrapper = mount(CreditCardForm, {
      props: { visible: true },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.get('[data-test="credit-card-form-cancel"]').attributes('data-icon')).toBe(
      'Close',
    )
    expect(wrapper.get('[data-test="credit-card-form-submit"]').attributes('data-icon')).toBe(
      'Check',
    )
  })

  it('accepts only digits in the last four field', async () => {
    const wrapper = mount(CreditCardForm, {
      props: { visible: true },
      global: { plugins: [i18n], stubs },
    })

    await wrapper.get('[data-test="credit-card-last-four"]').setValue('a1b2c345')
    await wrapper.get('[data-test="credit-card-form-submit"]').trigger('click')

    expect(wrapper.emitted('submit')[0][0]).toMatchObject({ last_four: '1234' })
  })
})
