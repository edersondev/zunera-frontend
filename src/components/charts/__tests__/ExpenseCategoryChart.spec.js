import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ExpenseCategoryChart from '../ExpenseCategoryChart.vue'

const stubs = {
  BaseChart: {
    name: 'BaseChart',
    props: ['series', 'options', 'label'],
    template: '<div data-test="base-chart" :aria-label="label" />',
  },
}

function category(index) {
  return {
    category: { id: index, name: `Categoria ${index}` },
    total: { amount_centavos: index * 1_000, currency_code: 'BRL' },
    share_percent: index,
    rank: index,
  }
}

describe('ExpenseCategoryChart', () => {
  it('keeps the eight leading categories and combines only the remaining chart slices', () => {
    const wrapper = mount(ExpenseCategoryChart, {
      props: { categories: Array.from({ length: 10 }, (_, index) => category(index + 1)) },
      global: { plugins: [i18n], stubs },
    })

    const chart = wrapper.getComponent({ name: 'BaseChart' })
    expect(chart.props('series')).toEqual([
      1_000,
      2_000,
      3_000,
      4_000,
      5_000,
      6_000,
      7_000,
      8_000,
      19_000,
    ])
    expect(chart.props('options').labels).toEqual([
      'Categoria 1',
      'Categoria 2',
      'Categoria 3',
      'Categoria 4',
      'Categoria 5',
      'Categoria 6',
      'Categoria 7',
      'Categoria 8',
      'Outras',
    ])
  })
})
