import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PageHeader from '../PageHeader.vue'

describe('PageHeader', () => {
  it('renders the optional context between the heading and the page actions', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Transações', description: 'Histórico de movimentações.' },
      slots: {
        context: '<p data-test="month">setembro de 2026</p>',
        actions: '<button data-test="new-movement">Nova transação</button>',
      },
    })

    const children = [...wrapper.get('header').element.children].map((node) => node.className)

    expect(children).toEqual(['', 'page-context', 'page-actions'])
    expect(wrapper.get('h1').text()).toBe('Transações')
    expect(wrapper.get('[data-test="month"]').text()).toBe('setembro de 2026')
  })

  it('omits the context container when the page has no header context', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Orçamentos' },
      slots: { actions: '<button>Copiar</button>' },
    })

    expect(wrapper.find('.page-context').exists()).toBe(false)
    expect(wrapper.get('.page-actions').text()).toBe('Copiar')
  })
})
