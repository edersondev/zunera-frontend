import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RemovedTransferCard from '../RemovedTransferCard.vue'

const transfer = {
  id: 3,
  amount_centavos: 123_456,
  transfer_date: '2026-09-13',
  description: 'Reserva do mês',
  source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
  destination_financial_account: { id: 2, name: 'Conta encerrada', status: 'archived' },
}

const stubs = {
  ElButton: {
    props: ['disabled', 'icon', 'loading'],
    emits: ['click'],
    template: '<button type="button" :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
  },
}

function mountCard(props = {}) {
  return mount(RemovedTransferCard, {
    props: { transfer, ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('RemovedTransferCard', () => {
  it('keeps removed transfer details and restore action visible', () => {
    const wrapper = mountCard()

    expect(wrapper.text()).toContain('Reserva do mês')
    expect(wrapper.text()).toContain('Conta corrente')
    expect(wrapper.text()).toContain('Conta encerrada (arquivada)')
    expect(wrapper.text()).toContain('1.234,56')
    expect(wrapper.get('[data-test="restore-transfer"]').text()).toContain('Restaurar')
  })

  it('emits the transfer selected for restoration', async () => {
    const wrapper = mountCard()

    await wrapper.get('[data-test="restore-transfer"]').trigger('click')

    expect(wrapper.emitted('restore')).toEqual([[transfer]])
  })
})
