import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardCurrentStatementCard from '../CreditCardCurrentStatementCard.vue'

const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })

const statement = {
  id: 72,
  status: 'closed',
  period_from: '2026-09-01',
  period_to: '2026-09-30',
  closing_date: '2026-09-30',
  due_date: '2026-10-07',
  outstanding_amount: money(12_345),
}

const stubs = {
  ElTag: { template: '<span><slot /></span>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElEmpty: { props: ['description'], template: '<p>{{ description }}</p>' },
}

describe('CreditCardCurrentStatementCard', () => {
  it('emphasizes outstanding balance and opens the existing statement route on request', async () => {
    const wrapper = mount(CreditCardCurrentStatementCard, {
      props: { statement },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.get('[data-test="credit-card-current-outstanding"]').text()).toContain('123,45')
    await wrapper.get('[data-test="credit-card-current-statement-open"]').trigger('click')
    expect(wrapper.emitted('open')).toEqual([[statement]])
  })

  it('does not offer navigation for synthesized current statements', () => {
    const wrapper = mount(CreditCardCurrentStatementCard, {
      props: { statement: { ...statement, id: null } },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.find('[data-test="credit-card-current-statement-open"]').exists()).toBe(false)
  })
})
