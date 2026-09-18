import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import DashboardPeriodSelector from '../DashboardPeriodSelector.vue'

const stubs = {
  ElRadioGroup: {
    name: 'ElRadioGroup',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: '<div class="radio-group"><slot /></div>',
  },
  ElRadioButton: {
    name: 'ElRadioButton',
    props: ['value'],
    template: '<label class="radio-button"><slot /></label>',
  },
  ElDatePicker: {
    name: 'ElDatePicker',
    props: ['modelValue', 'id', 'placeholder'],
    emits: ['update:modelValue'],
    template:
      '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElButton: {
    name: 'ElButton',
    props: ['disabled', 'loading'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
}

function mountSelector(props = {}) {
  return mount(DashboardPeriodSelector, {
    props: { rangeLabel: '1 de set. de 2026 - 17 de set. de 2026', ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('DashboardPeriodSelector', () => {
  it('shows the preset choices, the resolved range, and the default current month', () => {
    const wrapper = mountSelector()

    expect(wrapper.text()).toContain('Mês atual')
    expect(wrapper.text()).toContain('Mês anterior')
    expect(wrapper.text()).toContain('Personalizado')
    expect(wrapper.get('[data-test="dashboard-period-range"]').text()).toBe(
      '1 de set. de 2026 - 17 de set. de 2026',
    )
    expect(wrapper.find('[data-test="dashboard-period-custom-fields"]').exists()).toBe(false)
  })

  it('emits the selected preset without requesting a custom range', async () => {
    const wrapper = mountSelector()

    wrapper.getComponent({ name: 'ElRadioGroup' }).vm.$emit('change', 'previous_month')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('select-preset')).toEqual([['previous_month']])
    expect(wrapper.emitted('apply-custom')).toBeUndefined()
  })

  it('reveals labelled inclusive boundaries and applies a valid custom range', async () => {
    const wrapper = mountSelector({
      preset: 'custom',
      from: '2026-09-01',
      to: '2026-09-03',
    })

    expect(wrapper.get('label[for="dashboard-period-from"]').text()).toBe('Data inicial')
    expect(wrapper.get('label[for="dashboard-period-to"]').text()).toBe('Data final')

    await wrapper.get('[data-test="dashboard-period-apply"]').trigger('click')

    expect(wrapper.emitted('apply-custom')).toEqual([[{ from: '2026-09-01', to: '2026-09-03' }]])
  })

  it('blocks an inverted custom range with an explicit message', async () => {
    const wrapper = mountSelector({
      preset: 'custom',
      from: '2026-09-10',
      to: '2026-09-01',
    })

    expect(wrapper.get('[data-test="dashboard-period-error"]').text()).toBe(
      'A data final deve ser igual ou posterior à data inicial.',
    )
    expect(wrapper.get('[data-test="dashboard-period-apply"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="dashboard-period-apply"]').trigger('click')

    expect(wrapper.emitted('apply-custom')).toBeUndefined()
  })
})
