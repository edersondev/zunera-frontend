import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportPeriodSelector from '../ReportPeriodSelector.vue'

const stubs = {
  ElRadioGroup: { name: 'ElRadioGroup', emits: ['update:modelValue'], template: '<div><slot /></div>' },
  ElRadioButton: { name: 'ElRadioButton', props: ['value'], template: '<button><slot /></button>' },
  ElForm: { name: 'ElForm', template: '<form><slot /></form>' },
  ElFormItem: { name: 'ElFormItem', props: ['label'], template: '<div><label>{{ label }}</label><slot /></div>' },
  ElDatePicker: { name: 'ElDatePicker', emits: ['update:modelValue'], template: '<input />' },
  ElButton: { name: 'ElButton', props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
}
function render(scope) { return mount(ReportPeriodSelector, { props: { scope }, global: { plugins: [i18n], stubs } }) }
describe('ReportPeriodSelector', () => {
  it('offers five quick calendar choices plus custom and navigated month', () => {
    const wrapper = render({ preset: 'current_month', from: null, to: null, month: null })
    expect(wrapper.findAllComponents({ name: 'ElRadioButton' })).toHaveLength(6)
    wrapper.findComponent({ name: 'ElRadioGroup' }).vm.$emit('update:modelValue', 'previous_year')
    expect(wrapper.emitted('change')[0][0]).toMatchObject({ preset: 'previous_year', month: null })
  })
  it('requires both inclusive custom dates in order', async () => {
    const wrapper = render({ preset: 'custom', from: null, to: null, month: null })
    expect(wrapper.get('[data-test="report-period-apply"]').attributes('disabled')).toBeDefined()
    const pickers = wrapper.findAllComponents({ name: 'ElDatePicker' })
    pickers[0].vm.$emit('update:modelValue', '2026-09-14')
    pickers[1].vm.$emit('update:modelValue', '2026-08-15')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Escolha datas válidas')
    pickers[0].vm.$emit('update:modelValue', '2026-08-15')
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="report-period-apply"]').attributes('disabled')).toBeUndefined()
  })
})
