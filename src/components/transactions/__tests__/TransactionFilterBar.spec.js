import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionFilterBar from '../TransactionFilterBar.vue'
import { i18n } from '@/i18n'

const stubs = {
  ElCollapse: { props: ['modelValue'], template: '<section><slot /></section>' },
  ElCollapseItem: {
    props: ['name'],
    template: '<section><header><slot name="title" /></header><div><slot /></div></section>',
  },
  ElCard: {
    template: '<section><div><slot /></div><footer><slot name="footer" /></footer></section>',
  },
  ElIcon: { template: '<i><slot /></i>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { props: ['label'], template: '<label><span>{{ label }}</span><slot /></label>' },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElDatePicker: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<button type="button" @click="$emit(\'update:modelValue\', [\'2026-09-01\', \'2026-09-30\'])" />',
  },
  ElButton: {
    props: ['icon'],
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><component :is="icon" /><slot /></button>',
  },
}

function mountBar(filters = { view: 'active', per_page: 50 }) {
  return mount(TransactionFilterBar, {
    props: {
      filters,
      accounts: [{ id: 1, name: 'Conta principal' }],
      categories: [{ id: 2, name: 'Salário' }],
    },
    global: { plugins: [i18n], stubs },
  })
}

describe('TransactionFilterBar', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it('renders transaction labels in the active locale', () => {
    i18n.global.locale.value = 'en'
    const wrapper = mountBar()

    expect(wrapper.get('[data-test="transaction-filter-collapse"]').text()).toContain('Search')
    expect(wrapper.get('[data-test="filter-date-range"]').attributes('data-test')).toBe('filter-date-range')
    expect(wrapper.text()).toContain('Filter')
  })

  it('groups the search form in a collapsible Pesquisa panel', () => {
    const wrapper = mountBar()

    expect(wrapper.get('[data-test="transaction-filter-collapse"]').text()).toContain('Pesquisar')
    expect(wrapper.get('[data-test="transaction-filter-card"] [data-test="transaction-filters"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="transaction-filter-card"] footer [data-test="apply-filters"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="transaction-filter-card"] footer [data-test="clear-filters"]').exists()).toBe(true)
    expect(
      wrapper.findAll('[data-test="transaction-filter-card"] footer button').map((button) => button.attributes('data-test')),
    ).toEqual(['clear-filters', 'apply-filters'])
    expect(wrapper.get('[data-test="clear-filters"] svg').exists()).toBe(true)
    expect(wrapper.get('[data-test="apply-filters"] svg').exists()).toBe(true)
    expect(wrapper.get('[data-test="transaction-filter-collapse"] i svg').exists()).toBe(true)
  })

  it('offers every supported criterion control with its options', () => {
    const wrapper = mountBar()
    const controls = wrapper.findAll('[data-test]').map((node) => node.attributes('data-test'))

    expect(controls).toEqual(
      expect.arrayContaining([
        'filter-search',
        'filter-type',
        'filter-status',
        'filter-account',
        'filter-category',
        'filter-date-range',
      ]),
    )
    expect(wrapper.text()).toContain('Conta principal')
    expect(wrapper.text()).toContain('Salário')
  })

  it('emits the combined criteria when the form is applied', async () => {
    const wrapper = mountBar()

    await wrapper.get('[data-test="filter-search"]').setValue('almoço')
    await wrapper.get('[data-test="filter-type"]').setValue('expense')
    await wrapper.get('[data-test="filter-status"]').setValue('pending')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('apply')[0][0]).toMatchObject({
      q: 'almoço',
      type: 'expense',
      status: 'pending',
    })
  })

  it('maps the selected date range to the API date criteria', async () => {
    const wrapper = mountBar()

    await wrapper.get('[data-test="filter-date-range"]').trigger('click')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('apply').at(-1)[0]).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })

  it('clears every criterion and asks the parent to reset the list', async () => {
    const wrapper = mountBar({
      view: 'active',
      per_page: 50,
      q: 'almoço',
      type: 'income',
      status: 'effective',
      from: '2026-09-01',
    })

    await wrapper.get('[data-test="clear-filters"]').trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)

    await wrapper.get('form').trigger('submit')
    const payload = wrapper.emitted('apply').at(-1)[0]
    expect(payload).toMatchObject({ view: 'active', per_page: 50 })
    expect(payload.q).toBeUndefined()
    expect(payload.type).toBeUndefined()
    expect(payload.status).toBeUndefined()
    expect(payload.from).toBeUndefined()
  })

  it('keeps the form in sync when the active criteria change outside the bar', async () => {
    const wrapper = mountBar({ view: 'active', per_page: 50, q: 'antigo' })

    await wrapper.setProps({ filters: { view: 'active', per_page: 50, q: 'novo' } })
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('apply').at(-1)[0]).toMatchObject({ q: 'novo' })
  })
})
