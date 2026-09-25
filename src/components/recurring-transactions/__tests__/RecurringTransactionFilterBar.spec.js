import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Filter, RefreshLeft } from '@element-plus/icons-vue'
import { i18n } from '@/i18n'
import RecurringTransactionFilterBar from '../RecurringTransactionFilterBar.vue'

const stubs = {
  ElCollapse: { template: '<div><slot /></div>' },
  ElCollapseItem: { template: '<section><slot name="title" /><slot /></section>' },
  ElCard: { template: '<div><slot /><footer data-test="recurrence-filter-card-footer"><slot name="footer" /></footer></div>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { template: '<label><slot /></label>' },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElButton: {
    props: ['icon'],
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
  ElIcon: { template: '<i><slot /></i>' },
}

const accounts = [{ id: 1, name: 'Conta corrente' }]
const categories = [{ id: 10, name: 'Assinaturas' }]

function factory(filters = { per_page: 50 }) {
  return mount(RecurringTransactionFilterBar, {
    props: { filters, accounts, categories },
    global: { plugins: [i18n], stubs },
  })
}

describe('RecurringTransactionFilterBar', () => {
  it('emits all selected criteria as one explicit apply action', async () => {
    const wrapper = factory()
    const selects = wrapper.findAll('select')

    await selects[0].setValue('expense')
    await selects[1].setValue('financial_account')
    await selects[2].setValue('1')
    await selects[4].setValue('10')
    await selects[5].setValue('monthly')
    await selects[6].setValue('active')
    await wrapper.findAll('button').at(-1).trigger('click')

    expect(wrapper.emitted('apply')[0][0]).toEqual({
      per_page: 50,
      type: 'expense',
      destination_type: 'financial_account',
      financial_account_id: '1',
      category_id: '10',
      frequency: 'monthly',
      state: 'active',
    })
  })

  it('clears criteria and follows filter changes from its parent', async () => {
    const wrapper = factory({ per_page: 50, state: 'paused' })
    await wrapper.setProps({ filters: { per_page: 50, frequency: 'yearly' } })
    await nextTick()

    expect(wrapper.findAll('select')[5].element.value).toBe('yearly')
    await wrapper.findAll('button').at(0).trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('places filter action controls in the card footer with icons', () => {
    const wrapper = factory()
    const footer = wrapper.get('[data-test="recurrence-filter-card-footer"]')
    const clear = wrapper.findComponent('[data-test="recurrence-filter-clear"]')
    const apply = wrapper.findComponent('[data-test="recurrence-filter-apply"]')

    expect(footer.find('[data-test="recurrence-filter-clear"]').exists()).toBe(true)
    expect(footer.find('[data-test="recurrence-filter-apply"]').exists()).toBe(true)
    expect(clear.props('icon')).toBe(RefreshLeft)
    expect(apply.props('icon')).toBe(Filter)
  })
})
