import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionFilterBar from '../TransactionFilterBar.vue'
import { i18n } from '@/i18n'

const stubs = {
  ElDialog: {
    props: ['modelValue', 'title'],
    emits: ['update:modelValue'],
    template:
      '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>',
  },
  ElTag: {
    emits: ['close'],
    template: '<button type="button" @click="$emit(\'close\')"><slot /></button>',
  },
  ElIcon: { template: '<i><slot /></i>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { props: ['label'], template: '<label><span>{{ label }}</span><slot /></label>' },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<div><slot name="prefix" /><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /></div>',
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
      "<button type=\"button\" @click=\"$emit('update:modelValue', ['2026-09-01', '2026-09-30'])\" />",
  },
  ElButton: {
    props: ['icon', 'nativeType'],
    emits: ['click'],
    template:
      '<button :type="nativeType ?? \'button\'" @click="$emit(\'click\')"><component :is="icon" /><slot /></button>',
  },
}

function mountBar(filters = { view: 'active', per_page: 50 }, month = { year: 2026, month: 9 }) {
  return mount(TransactionFilterBar, {
    props: {
      filters,
      accounts: [{ id: 1, name: 'Conta principal' }],
      categories: [{ id: 2, name: 'Salário' }],
      month,
    },
    global: { plugins: [i18n], stubs },
  })
}

async function openFilters(wrapper) {
  await wrapper.get('[data-test="open-filters"]').trigger('click')
}

describe('TransactionFilterBar', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it('keeps search visible and localizes the filter dialog', async () => {
    i18n.global.locale.value = 'en'
    const wrapper = mountBar()

    expect(wrapper.get('[data-test="filter-search"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="open-filters"]').text()).toContain('Filters')

    await openFilters(wrapper)

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('Filter transactions')
    expect(wrapper.get('[data-test="filter-date-range"]').exists()).toBe(true)
  })

  it('opens all advanced filters in a dialog with cancel and apply actions', async () => {
    const wrapper = mountBar()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await openFilters(wrapper)

    const controls = wrapper.findAll('[data-test]').map((node) => node.attributes('data-test'))
    expect(controls).toEqual(
      expect.arrayContaining([
        'dialog-filter-search',
        'filter-type',
        'filter-status',
        'filter-account',
        'filter-category',
        'filter-date-range',
        'cancel-filters',
        'apply-filters',
      ]),
    )
    expect(wrapper.text()).toContain('Conta principal')
    expect(wrapper.text()).toContain('Salário')
  })

  it('shares search state between page and dialog and applies combined criteria', async () => {
    const wrapper = mountBar()

    await wrapper.get('[data-test="filter-search"] input').setValue('almoço')
    await openFilters(wrapper)
    expect(wrapper.get('[data-test="dialog-filter-search"] input').element.value).toBe('almoço')

    await wrapper.get('[data-test="filter-type"]').setValue('expense')
    await wrapper.get('[data-test="filter-status"]').setValue('pending')
    await wrapper.get('[data-test="transaction-filters"]').trigger('submit')

    expect(wrapper.emitted('apply')[0][0]).toMatchObject({
      q: 'almoço',
      type: 'expense',
      status: 'pending',
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('applies visible search from Enter without opening the dialog', async () => {
    const wrapper = mountBar()

    await wrapper.get('[data-test="filter-search"] input').setValue(' mercado ')
    await wrapper.get('[data-test="transaction-search-form"]').trigger('submit')

    expect(wrapper.emitted('apply')[0][0]).toMatchObject({ q: 'mercado' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('maps selected date range to API criteria', async () => {
    const wrapper = mountBar()
    await openFilters(wrapper)

    await wrapper.get('[data-test="filter-date-range"]').trigger('click')
    await wrapper.get('[data-test="apply-filters"]').trigger('click')

    expect(wrapper.emitted('apply').at(-1)[0]).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })

  it('clears all criteria from the active filter controls', async () => {
    const wrapper = mountBar({
      view: 'active',
      per_page: 50,
      q: 'almoço',
      type: 'income',
      status: 'effective',
      from: '2026-09-01',
    })
    await wrapper.get('[data-test="clear-active-filters"]').trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('discards unapplied dialog edits on cancel', async () => {
    const wrapper = mountBar({ view: 'active', per_page: 50, q: 'aplicado' })
    await openFilters(wrapper)
    await wrapper.get('[data-test="dialog-filter-search"] input').setValue('rascunho')
    await wrapper.get('[data-test="cancel-filters"]').trigger('click')
    await openFilters(wrapper)

    expect(wrapper.get('[data-test="dialog-filter-search"] input').element.value).toBe('aplicado')
    expect(wrapper.emitted('apply')).toBeUndefined()
  })

  it('renders localized active tags and removes one criterion without clearing others', async () => {
    const wrapper = mountBar({
      view: 'active',
      per_page: 50,
      q: 'almoço',
      type: 'income',
      financial_account_id: 1,
      from: '2026-09-05',
      to: '2026-09-20',
    })

    expect(wrapper.get('[data-test="active-filter-type"]').text()).toContain('Receita')
    expect(wrapper.get('[data-test="active-filter-financial_account_id"]').text()).toContain(
      'Conta principal',
    )
    expect(wrapper.get('[data-test="active-filter-period"]').text()).toContain('set.')

    await wrapper.get('[data-test="active-filter-q"]').trigger('click')

    expect(wrapper.emitted('apply').at(-1)[0]).toMatchObject({
      q: undefined,
      type: 'income',
      financial_account_id: 1,
    })
  })

  it('keeps visible and dialog search synced when applied criteria change outside', async () => {
    const wrapper = mountBar({ view: 'active', per_page: 50, q: 'antigo' })

    await wrapper.setProps({ filters: { view: 'active', per_page: 50, q: 'novo' } })
    expect(wrapper.get('[data-test="filter-search"] input').element.value).toBe('novo')

    await openFilters(wrapper)
    expect(wrapper.get('[data-test="dialog-filter-search"] input').element.value).toBe('novo')
  })

  it('places the month navigator beside the search and filter controls', async () => {
    const wrapper = mountBar()
    const row = wrapper.get('[data-test="transaction-search-form"]')
    const controls = row.get('.search-controls')

    expect(controls.get('[data-test="filter-search"]').exists()).toBe(true)
    expect(controls.get('[data-test="open-filters"]').text()).toContain('Filtros')
    expect(row.get('[data-test="month-label"]').text()).toBe('setembro de 2026')
  })

  it('emits the month the navigator moves to', async () => {
    const wrapper = mountBar()

    await wrapper.get('[data-test="month-next"]').trigger('click')

    expect(wrapper.emitted('change-month')).toEqual([[{ year: 2026, month: 10 }]])
  })

  it('keeps the period out of the criteria strip while the navigator month is active', async () => {
    const wrapper = mountBar({ view: 'active', per_page: 50, from: '2026-09-01', to: '2026-09-30' })

    expect(wrapper.find('[data-test="active-filter-period"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="active-criteria"]').exists()).toBe(false)
  })

  it('shows the period criterion for a custom range and returns to the navigator month when removed', async () => {
    const wrapper = mountBar({
      view: 'active',
      per_page: 50,
      q: 'mercado',
      from: '2026-09-05',
      to: '2026-09-20',
    })

    expect(wrapper.get('[data-test="active-filter-period"]').text()).toContain('set.')

    await wrapper.get('[data-test="active-filter-period"]').trigger('click')

    expect(wrapper.emitted('apply').at(-1)[0]).toMatchObject({
      q: 'mercado',
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })
})
