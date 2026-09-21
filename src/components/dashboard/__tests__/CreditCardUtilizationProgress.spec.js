import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardUtilizationProgress from '../CreditCardUtilizationProgress.vue'

function mountProgress(props = {}) {
  return mount(CreditCardUtilizationProgress, {
    props: {
      label: 'Utilização do crédito',
      usedCentavos: 0,
      limitCentavos: 100_000,
      availableCentavos: 100_000,
      ...props,
    },
    global: { plugins: [i18n] },
  })
}

describe('CreditCardUtilizationProgress', () => {
  it('renders exact zero utilization accessibly', () => {
    const wrapper = mountProgress()

    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0')
    expect(wrapper.get('[data-test="credit-utilization-percent"]').text()).toBe('0%')
  })

  it('keeps fractional utilization in text while capping only visual progress', () => {
    const wrapper = mountProgress({
      usedCentavos: 100_500,
      limitCentavos: 100_000,
      availableCentavos: -500,
      isOverLimit: true,
    })

    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuetext')).toContain('100,5%')
    expect(wrapper.get('[data-test="credit-utilization-percent"]').text()).toBe('100,5%')
    expect(wrapper.get('.credit-utilization-fill').attributes('style')).toContain('width: 100%')
  })

  it('avoids an invalid percentage when the credit limit is unavailable', () => {
    const wrapper = mountProgress({ limitCentavos: 0 })

    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="credit-utilization-unavailable"]').text()).toContain(
      'indisponível',
    )
  })
})
