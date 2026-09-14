import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { i18n } from '@/i18n'
import TransferFormDialog from '../TransferFormDialog.vue'

const stubs = {
  ElDialog: {
    props: ['modelValue', 'title'],
    template:
      '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>',
  },
  ElForm: { props: ['rules'], template: '<form><slot /></form>' },
  ElFormItem: {
    props: ['label', 'error', 'prop', 'required'],
    template:
      '<label :data-prop="prop" :data-required="required"><span>{{ label }}</span><slot /><small v-if="error">{{ error }}</small></label>',
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  CurrencyAmountInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><slot /></select>',
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElRadioGroup: {
    props: ['modelValue'],
    template: '<fieldset :data-value="modelValue"><slot /></fieldset>',
  },
  ElRadio: {
    props: ['value'],
    template: '<label><input type="radio" :value="value" /><slot /></label>',
  },
  ElDatePicker: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template:
      '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)" />',
  },
  ElButton: {
    props: ['icon', 'type'],
    emits: ['click'],
    template:
      '<button type="button" :data-type="type" @click="$emit(\'click\')"><component :is="icon" /><slot /></button>',
  },
}

const accounts = [
  { id: 1, name: 'Conta corrente', status: 'active' },
  { id: 2, name: 'Poupança', status: 'active' },
  { id: 9, name: 'Conta encerrada', status: 'archived' },
]

const archivedTransfer = {
  id: 5,
  status: 'pending',
  amount_centavos: 12_345,
  transfer_date: '2026-08-01',
  description: 'Histórico',
  notes: 'Nota histórica',
  source_financial_account: { id: 9, name: 'Conta encerrada', status: 'archived' },
  destination_financial_account: { id: 2, name: 'Poupança', status: 'active' },
}

function mountDialog(props) {
  return mount(TransferFormDialog, {
    props: { modelValue: true, accounts, ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('TransferFormDialog', () => {
  it('keeps an archived current side selectable without resubmitting its association', async () => {
    const wrapper = mountDialog({ transfer: archivedTransfer })

    expect(wrapper.get('[data-test="transfer-source"]').text()).toContain(
      'Conta encerrada (arquivada)',
    )
    expect(wrapper.get('[data-test="transfer-source"]').text()).toContain('Conta corrente')
    expect(wrapper.get('[data-test="transfer-status"]').attributes('data-value')).toBe('pending')
    expect(wrapper.get('[data-test="transfer-amount"]').element.value).toBe('12345')
    expect(wrapper.get('[data-test="transfer-date"]').element.value).toBe('2026-08-01')

    await wrapper.get('[data-test="transfer-description"]').setValue('Correção histórica')
    await wrapper.get('[data-test="save-transfer"]').trigger('click')

    expect(wrapper.emitted('submit')[0][0]).toEqual({
      description: 'Correção histórica',
    })
  })

  it('never offers an archived account for a new side and excludes the source from the destination', async () => {
    const wrapper = mountDialog({})

    expect(wrapper.get('[data-test="transfer-source"]').text()).not.toContain('(arquivada)')

    await wrapper.get('[data-test="transfer-source"]').setValue('1')
    await nextTick()

    const destination = wrapper.get('[data-test="transfer-destination"]')
    expect(destination.text()).toContain('Poupança')
    expect(destination.text()).not.toContain('Conta corrente')
    expect(destination.text()).not.toContain('Conta encerrada')
  })

  it('keeps the archived destination selectable while another side is corrected', async () => {
    const wrapper = mountDialog({
      transfer: {
        ...archivedTransfer,
        source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
      },
    })

    expect(wrapper.get('[data-test="transfer-source"]').text()).toContain('Conta corrente')
    expect(wrapper.get('[data-test="transfer-destination"]').exists()).toBe(true)
  })

  it('defaults new transfers to effective and switches future dates to pending without reservation', async () => {
    const wrapper = mountDialog({})
    expect(wrapper.get('[data-test="transfer-status"]').attributes('data-value')).toBe('effective')

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    await wrapper.get('[data-test="transfer-date"]').setValue(tomorrow)

    expect(wrapper.get('[data-test="transfer-status"]').attributes('data-value')).toBe('pending')
    expect(wrapper.get('[data-test="transfer-pending-notice"]').text()).toContain(
      'não reservam saldo',
    )
  })

  it('warns that an effective transfer retimed into the future keeps both balance effects', async () => {
    const wrapper = mountDialog({
      transfer: {
        ...archivedTransfer,
        status: 'effective',
        source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
        transfer_date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
      },
    })

    expect(wrapper.get('[data-test="transfer-future-notice"]').text()).toContain('continua efetiva')
  })

  it('blocks duplicate submits while a save is in flight', async () => {
    const wrapper = mountDialog({ saving: true })

    await wrapper.get('[data-test="save-transfer"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('shows server field feedback and uses a dangerous cancel action with an icon', async () => {
    const wrapper = mountDialog({
      errors: {
        source_financial_account_id: ['Conta arquivada.'],
        status: ['Data futura exige pendente.'],
        amount_centavos: ['Valor inválido.'],
      },
    })

    expect(wrapper.text()).toContain('Conta arquivada.')
    expect(wrapper.text()).toContain('Data futura exige pendente.')
    expect(wrapper.text()).toContain('Valor inválido.')
    expect(
      wrapper.get('[data-prop="source_financial_account_id"]').attributes('data-required'),
    ).toBeDefined()
    expect(
      wrapper.get('[data-prop="destination_financial_account_id"]').attributes('data-required'),
    ).toBeDefined()

    const cancel = wrapper.get('[data-test="cancel-transfer"]')
    expect(cancel.attributes('data-type')).toBe('danger')
    expect(cancel.find('svg').exists()).toBe(true)

    await cancel.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
    expect(wrapper.get('[data-test="save-transfer"] svg').exists()).toBe(true)
  })

  it('converts blank optional text to null so cleared notes stay honest', async () => {
    const wrapper = mountDialog({})

    await wrapper.get('[data-test="save-transfer"]').trigger('click')

    expect(wrapper.emitted('submit')[0][0]).toMatchObject({ description: null, notes: null })
  })
})
