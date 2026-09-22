import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardManagementCard from '../CreditCardManagementCard.vue'

const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })
const card = {
  id: 41,
  name: 'Nubank Platinum',
  institution_name: 'Nubank',
  last_four: '1234',
  color: 'violet',
  icon: 'credit_card',
  summary: {
    credit_limit: money(500_000),
    used_credit: money(125_000),
    card_credit: money(5_000),
    available_credit: money(375_000),
    is_over_limit: false,
  },
  current_statement: {
    id: 72,
    outstanding_amount: money(40_000),
    due_date: '2026-10-17',
    status: 'closed',
  },
}

const stubs = {
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElIcon: { template: '<i><slot /></i>' },
  ElTag: { template: '<span><slot /></span>' },
}

describe('CreditCardManagementCard', () => {
  it('prioritizes available credit and emits card actions through explicit intents', async () => {
    const wrapper = mount(CreditCardManagementCard, {
      props: { card },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.get('[data-test="credit-card-41"]').text()).toContain('Nubank Platinum')
    expect(wrapper.get('[data-test="credit-card-available-41"]').text()).toContain('3.750,00')
    expect(wrapper.get('[data-test="credit-card-current-statement-41"]').text()).toContain('400,00')
    expect(wrapper.get('[data-test="credit-utilization-percent"]').text()).toBe('25%')
    expect(wrapper.get('[data-test="credit-card-appearance"]').attributes('style')).toContain(
      'var(--chart-violet',
    )
    expect(wrapper.get('[data-test="credit-card-appearance"]').attributes('aria-label')).toContain('Violet')

    await wrapper.get('[data-test="credit-card-open-41"]').trigger('click')
    await wrapper.get('[data-test="credit-card-edit"]').trigger('click')
    await wrapper.get('[data-test="credit-card-archive"]').trigger('click')

    expect(wrapper.emitted('open')[0]).toEqual([card])
    expect(wrapper.emitted('edit')[0]).toEqual([card])
    expect(wrapper.emitted('archive')[0]).toEqual([card])
  })
})
