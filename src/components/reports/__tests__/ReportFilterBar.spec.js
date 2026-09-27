import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ReportFilterBar from '../ReportFilterBar.vue'
import { account, category } from './reportFixtures'

const stubs = {
  ElForm: { name: 'ElForm', template: '<form><slot /></form>' },
  ElFormItem: { name: 'ElFormItem', props: ['label'], template: '<div><label>{{ label }}</label><slot /></div>' },
  ElSelect: { name: 'ElSelect', emits: ['update:modelValue'], template: '<div><slot /></div>' },
  ElOption: { name: 'ElOption', props: ['label'], template: '<span>{{ label }}</span>' },
  ElTag: { name: 'ElTag', emits: ['close'], template: '<span><slot /><button @click="$emit(\'close\')">x</button></span>' },
  ElButton: { name: 'ElButton', emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
}
function render(scope = { account_id: null, category_id: null, transaction_type: null }) { return mount(ReportFilterBar, { props: { scope, accounts: [account], categories: [category] }, global: { plugins: [i18n], stubs } }) }

describe('ReportFilterBar', () => {
  it('shows selected archived account/category chips and resets scope', async () => {
    const wrapper = render({ account_id: 7, category_id: 3, transaction_type: 'expense' })
    expect(wrapper.text()).toContain('Main account')
    expect(wrapper.text()).toContain('Food')
    expect(wrapper.text()).toContain('Arquivada')
    await wrapper.findAll('button').find((button) => button.text() === 'Limpar filtros').trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })
  it('clears an incompatible category when type changes to income', () => {
    const wrapper = render({ account_id: null, category_id: 3, transaction_type: 'expense' })
    wrapper.findAllComponents({ name: 'ElSelect' })[1].vm.$emit('update:modelValue', 'income')
    expect(wrapper.emitted('change')[0][0]).toEqual({ transaction_type: 'income', category_id: null })
  })
})
