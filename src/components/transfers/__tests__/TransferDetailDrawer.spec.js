import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TransferDetailDrawer from '../TransferDetailDrawer.vue'

const stubs = {
  ElDrawer: {
    props: ['modelValue', 'title'],
    emits: ['update:modelValue'],
    template: '<aside v-if="modelValue"><h1>{{ title }}</h1><slot /><slot name="footer" /></aside>',
  },
  ElDescriptions: { template: '<dl><slot /></dl>' },
  ElDescriptionsItem: { props: ['label'], template: '<div><dt>{{ label }}</dt><dd><slot /></dd></div>' },
  ElButton: {
    props: ['type'],
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
}

const transfer = {
  id: 3,
  status: 'pending',
  amount_centavos: 123_456,
  transfer_date: '2026-09-13',
  description: 'Reserva do mês',
  notes: null,
  source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
  destination_financial_account: { id: 2, name: 'Conta encerrada', status: 'archived' },
}

function mountDrawer(props = {}) {
  return mount(TransferDetailDrawer, {
    props: { modelValue: true, transfer, ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('TransferDetailDrawer', () => {
  it('shows both account sides with archived labels, status, and neutral amount', () => {
    const wrapper = mountDrawer()
    const text = wrapper.get('[data-test="transfer-detail"]').text()

    expect(text).toContain('Conta corrente')
    expect(text).toContain('Conta encerrada (arquivada)')
    expect(text).toContain('Pendente')
    expect(text).toContain('1.234,56')
    expect(text).toContain('Reserva do mês')
    expect(text).toContain('—')
    expect(text).not.toContain('+')
  })

  it('emits edit and remove for the open transfer', async () => {
    const wrapper = mountDrawer()

    await wrapper.get('[data-test="edit-transfer"]').trigger('click')
    await wrapper.get('[data-test="remove-transfer"]').trigger('click')

    expect(wrapper.emitted('edit')[0][0]).toEqual(transfer)
    expect(wrapper.emitted('remove')[0][0]).toEqual(transfer)
  })
})
