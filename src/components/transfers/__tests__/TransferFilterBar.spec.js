import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TransferFilterBar from '../TransferFilterBar.vue'

const stubs = {
  ElCollapse: { template: '<div><slot /></div>' },
  ElCollapseItem: { template: '<section><slot /><slot name="title" /></section>' },
  ElCard: { template: '<div><slot /><slot name="footer" /></div>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { props: ['label'], template: '<label><span>{{ label }}</span><slot /></label>' },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElDatePicker: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input type="text" data-role="range" />',
  },
  ElButton: {
    props: ['icon', 'type'],
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  ElIcon: { template: '<span><slot /></span>' },
}

const accounts = [
  { id: 1, name: 'Conta corrente', status: 'active' },
  { id: 2, name: 'Poupança', status: 'active' },
]

function mountBar(filters = {}) {
  return mount(TransferFilterBar, {
    props: { filters: { view: 'active', per_page: 50, ...filters }, accounts, loading: false },
    global: { plugins: [i18n], stubs },
  })
}

describe('TransferFilterBar', () => {
  it('offers text, status, both transfer sides, and a period range', () => {
    const wrapper = mountBar()

    expect(wrapper.get('[data-test="filter-search"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="filter-status"]').text()).toContain('Efetiva')
    expect(wrapper.get('[data-test="filter-status"]').text()).toContain('Pendente')
    expect(wrapper.get('[data-test="filter-source"]').text()).toContain('Conta corrente')
    expect(wrapper.get('[data-test="filter-destination"]').text()).toContain('Poupança')
    expect(wrapper.get('[data-test="filter-date-range"]').exists()).toBe(true)
  })

  it('applies the visible criteria including both sides and the period', async () => {
    const wrapper = mountBar()
    await wrapper.get('[data-test="filter-search"]').setValue('reserva')
    await wrapper.get('[data-test="filter-status"]').setValue('pending')
    await wrapper.get('[data-test="filter-source"]').setValue('1')
    await wrapper.get('[data-test="apply-filters"]').trigger('click')

    expect(wrapper.emitted('apply')[0][0]).toMatchObject({
      q: 'reserva',
      status: 'pending',
      source_financial_account_id: '1',
      view: 'active',
      per_page: 50,
    })
  })

  it('clears every criterion including the visible active values', async () => {
    const wrapper = mountBar({ q: 'reserva', status: 'pending', from: '2026-09-01', to: '2026-09-30' })

    await wrapper.get('[data-test="clear-filters"]').trigger('click')

    expect(wrapper.emitted('clear')).toBeTruthy()
    expect(wrapper.emitted('apply')).toBeUndefined()
    expect(wrapper.get('[data-test="filter-search"]').element.value).toBe('')
    expect(wrapper.get('[data-test="filter-status"]').element.value).toBe('')
  })
})
