import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardPurchaseList from '../CreditCardPurchaseList.vue'

const purchase = {
  id: 301,
  description: 'Headphones',
  purchase_date: '2026-09-21',
  installment_count: 3,
  is_directly_editable: true,
  total_amount: { amount_centavos: 10_000 },
  installments: [{ sequence: 1, recognition_status: 'pending' }],
}

const ElDropdown = {
  name: 'ElDropdown',
  emits: ['command'],
  template: '<div><slot /><slot name="dropdown" /></div>',
}

describe('CreditCardPurchaseList', () => {
  it('keeps purchase values readable and sends contextual actions as existing intents', async () => {
    const wrapper = mount(CreditCardPurchaseList, {
      props: { purchases: [purchase] },
      global: {
        plugins: [i18n],
        stubs: {
          ElDropdown,
          ElDropdownMenu: { template: '<div><slot /></div>' },
          ElDropdownItem: { template: '<button><slot /></button>' },
          ElButton: { template: '<button><slot /></button>' },
          ElTag: { template: '<span><slot /></span>' },
          ElIcon: { template: '<span><slot /></span>' },
          ElEmpty: true,
        },
      },
    })

    const row = wrapper.get('[data-test="credit-card-purchase-301"]')
    expect(row.text()).toContain('Headphones')
    expect(row.text()).toContain('100,00')
    expect(row.text()).toContain('Previsto')

    await wrapper.findComponent({ name: 'ElDropdown' }).vm.$emit('command', 'correct')
    await wrapper.findComponent({ name: 'ElDropdown' }).vm.$emit('command', 'refund')

    expect(wrapper.emitted('correct')).toEqual([[purchase]])
    expect(wrapper.emitted('refund')).toEqual([[purchase]])
  })

  it('hides correction while retaining refund for closed purchase history', () => {
    const wrapper = mount(CreditCardPurchaseList, {
      props: { purchases: [{ ...purchase, is_directly_editable: false }] },
      global: {
        plugins: [i18n],
        stubs: {
          ElDropdown,
          ElDropdownMenu: { template: '<div><slot /></div>' },
          ElDropdownItem: { template: '<button><slot /></button>' },
          ElButton: { template: '<button><slot /></button>' },
          ElTag: { template: '<span><slot /></span>' },
          ElIcon: { template: '<span><slot /></span>' },
          ElEmpty: true,
        },
      },
    })

    expect(wrapper.find('[data-test="credit-card-purchase-correct-301"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="credit-card-purchase-credit-event-301"]').exists()).toBeTruthy()
  })
})
