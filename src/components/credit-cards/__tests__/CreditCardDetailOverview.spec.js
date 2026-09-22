import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardDetailOverview from '../CreditCardDetailOverview.vue'

const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })

function factory(summary = {}) {
  return mount(CreditCardDetailOverview, {
    props: {
      card: {
        summary: {
          credit_limit: money(500_000),
          used_credit: money(12_345),
          card_credit: money(2_000),
          available_credit: money(489_655),
          ...summary,
        },
      },
    },
    global: {
      plugins: [i18n],
      stubs: {
        CreditCardUtilizationProgress: {
          props: ['usedCentavos', 'limitCentavos', 'isOverLimit'],
          template: '<div data-test="utilization" :data-over-limit="isOverLimit">{{ usedCentavos }}/{{ limitCentavos }}</div>',
        },
      },
    },
  })
}

describe('CreditCardDetailOverview', () => {
  it('shows authoritative card metrics and utilization without recategorizing card credit', () => {
    const wrapper = factory()

    expect(wrapper.get('[data-test="credit-card-detail-summary"]').text()).toContain('5.000,00')
    expect(wrapper.get('[data-test="credit-card-detail-card-credit"]').text()).toContain('20,00')
    expect(wrapper.get('[data-test="credit-card-detail-available"]').text()).toContain('4.896,55')
    expect(wrapper.get('[data-test="utilization"]').text()).toBe('12345/500000')
    expect(wrapper.find('.is-used').exists()).toBe(true)
    expect(wrapper.find('.is-available').exists()).toBe(true)
  })

  it('keeps the exact available amount visible and delegates over-limit presentation to progress', () => {
    const wrapper = factory({ available_credit: money(-345) })

    expect(wrapper.get('[data-test="credit-card-detail-available"]').text()).toContain('3,45')
    expect(wrapper.get('[data-test="credit-card-detail-over-limit"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="utilization"]').attributes('data-over-limit')).toBe('true')
  })
})
