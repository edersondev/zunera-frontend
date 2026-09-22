import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardStatementHistory from '../CreditCardStatementHistory.vue'

const statement = {
  id: 72,
  status: 'open',
  period_from: '2026-09-01',
  period_to: '2026-09-30',
  outstanding_amount: { amount_centavos: 12_345 },
}

describe('CreditCardStatementHistory', () => {
  it('presents structured status and amount then emits existing statement navigation intent', async () => {
    const wrapper = mount(CreditCardStatementHistory, {
      props: { statements: [statement] },
      global: {
        plugins: [i18n],
        stubs: {
          ElTag: { template: '<span><slot /></span>' },
          ElEmpty: true,
          ElIcon: { template: '<span><slot /></span>' },
        },
      },
    })

    const row = wrapper.get('[data-test="credit-card-statement-72"]')
    expect(row.text()).toContain('123,45')
    expect(row.text()).toContain('Aberta')
    await row.trigger('click')

    expect(wrapper.emitted('open')).toEqual([[statement]])
  })
})
