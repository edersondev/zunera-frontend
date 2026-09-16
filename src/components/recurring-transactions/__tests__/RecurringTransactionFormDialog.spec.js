import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { i18n } from '@/i18n'
import RecurringTransactionFormDialog from '../RecurringTransactionFormDialog.vue'

const stubs = {
  ElDialog: {
    props: ['modelValue', 'title'],
    template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /></section>',
  },
  ElForm: { props: ['rules'], template: '<form><slot /></form>' },
  ElFormItem: {
    props: ['label', 'error', 'prop', 'required'],
    template: '<label :data-prop="prop"><span>{{ label }}</span><slot /><small v-if="error">{{ error }}</small></label>',
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  CurrencyAmountInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input type="number" :data-amount="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><slot /></select>',
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElRadioGroup: { props: ['modelValue'], template: '<fieldset><slot /></fieldset>' },
  ElRadio: { props: ['value'], template: '<label><input type="radio" :value="value" /><slot /></label>' },
  ElDatePicker: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElButton: {
    props: ['icon', 'type', 'disabled'],
    emits: ['click'],
    template: '<button type="button" :data-type="type" :disabled="disabled" @click="$emit(\'click\')"><component :is="icon" /><slot /></button>',
  },
  ElIcon: { template: '<i><slot /></i>' },
}

const accounts = [
  { id: 1, name: 'Conta ativa', status: 'active' },
  { id: 2, name: 'Conta arquivada', status: 'archived' },
]
const categories = [
  { id: 10, name: 'Assinaturas', classification: 'expense', status: 'active' },
  { id: 11, name: 'Salário', classification: 'income', status: 'active' },
  { id: 12, name: 'Antiga', classification: 'expense', status: 'archived' },
]

function factory(props = {}) {
  return mount(RecurringTransactionFormDialog, {
    props: { modelValue: true, accounts, categories, ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('RecurringTransactionFormDialog', () => {
  it('uses the standard danger cancel action with a close icon', () => {
    const wrapper = factory({ saving: true })
    const cancel = wrapper.get('[data-test="recurrence-cancel"]')

    expect(cancel.attributes('data-type')).toBe('danger')
    expect(cancel.attributes('disabled')).toBeDefined()
    expect(cancel.find('svg').exists()).toBe(true)
  })

  it('uses the standard save action with a confirmation icon', () => {
    const wrapper = factory({ saving: true })
    const save = wrapper.get('[data-test="recurrence-save"]')

    expect(save.text()).toBe('Salvar')
    expect(save.attributes('data-type')).toBe('primary')
    expect(save.attributes('disabled')).toBeDefined()
    expect(save.find('svg').exists()).toBe(true)
  })

  it('offers only active accounts and categories that match the type', async () => {
    const wrapper = factory()
    await nextTick()

    const selects = wrapper.findAll('select')
    expect(selects[0].text()).toContain('Conta ativa')
    expect(selects[0].text()).not.toContain('Conta arquivada')
    expect(selects[1].text()).toContain('Assinaturas')
    expect(selects[1].text()).not.toContain('Salário')
    expect(selects[1].text()).not.toContain('Antiga')
  })

  it('submits the create payload with the chosen values', async () => {
    const wrapper = factory()
    await nextTick()

    const selects = wrapper.findAll('select')
    await selects[0].setValue('1')
    await selects[1].setValue('10')
    await wrapper.find('input[type="number"]').setValue('45000')
    await wrapper.find('input[type="date"]').setValue('2026-10-01')
    await wrapper.findAll('button').at(-1).trigger('click')

    const [payload] = wrapper.emitted('submit')[0]
    expect(payload).toMatchObject({
      financial_account_id: 1,
      category_id: 10,
      type: 'expense',
      amount_centavos: 45000,
      frequency: 'monthly',
      start_date: '2026-10-01',
    })
  })

  it('shows edit copy and field errors from the store', async () => {
    const rule = {
      id: 5,
      type: 'expense',
      amount_centavos: 25000,
      frequency: 'yearly',
      start_date: '2026-03-01',
      end_date: null,
      description: 'Aluguel',
      notes: null,
      financial_account: { id: 1, name: 'Conta ativa', status: 'active' },
      category: { id: 10, name: 'Assinaturas', classification: 'expense', status: 'active' },
    }
    const wrapper = factory({ rule, errors: { description: ['Informe uma descrição.'] } })
    await nextTick()

    expect(wrapper.find('[role="dialog"]').attributes('aria-label')).toBe('Editar recorrência')
    expect(wrapper.text()).toContain('Informe uma descrição.')
  })
})
