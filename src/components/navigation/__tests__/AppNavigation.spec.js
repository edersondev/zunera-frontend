import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppNavigation from '../AppNavigation.vue'
import { i18n } from '@/i18n'

const items = [
  { id: 'protected-home', routeName: 'protected-home', label: 'Início' },
  {
    id: 'settings',
    label: 'Configurações',
    children: [
      {
        routeName: 'financial-accounts',
        activeRouteNames: ['financial-accounts', 'financial-accounts-archived'],
        label: 'Contas financeiras',
      },
      { routeName: 'categories', activeRouteNames: ['categories', 'categories-archived'], label: 'Categorias' },
    ],
  },
  {
    id: 'cash-flow',
    label: 'Fluxo de caixa',
    children: [
      { routeName: 'transactions', label: 'Transações' },
      { routeName: 'recurring-transactions', label: 'Recorrências' },
      { routeName: 'transactions-removed', label: 'Transações removidas' },
    ],
  },
]

function stubs() {
  return {
    plugins: [i18n],
    stubs: {
      ElMenu: {
        name: 'ElMenu',
        props: ['defaultActive', 'defaultOpeneds', 'uniqueOpened'],
        emits: ['select'],
        template: '<div data-test="navigation-menu"><slot /></div>',
      },
      ElSubMenu: {
        name: 'ElSubMenu',
        props: ['index'],
        template: '<section :data-test="`navigation-group-${index}`"><slot name="title" /><slot /></section>',
      },
      ElMenuItem: {
        name: 'ElMenuItem',
        props: ['index'],
        template: '<button :data-test="`navigation-item-${index}`"><slot /></button>',
      },
      ElIcon: true,
    },
  }
}

describe('AppNavigation', () => {
  it('renders Home before grouped Settings and Cash flow destinations', () => {
    const wrapper = mount(AppNavigation, {
      props: { items, activeRoute: 'transactions' },
      global: stubs(),
    })

    expect(wrapper.get('[data-test="navigation-item-protected-home"]').text()).toContain('Início')
    expect(wrapper.get('[data-test="navigation-group-settings"]').text()).toContain('Configurações')
    expect(wrapper.get('[data-test="navigation-group-cash-flow"]').text()).toContain('Fluxo de caixa')
    expect(wrapper.get('[data-test="navigation-item-financial-accounts"]').text()).toContain('Contas financeiras')
    expect(wrapper.get('[data-test="navigation-item-categories"]').text()).toContain('Categorias')
    expect(wrapper.get('[data-test="navigation-item-transactions"]').text()).toContain('Transações')
    expect(wrapper.get('[data-test="navigation-item-recurring-transactions"]').text()).toContain('Recorrências')
    expect(wrapper.get('[data-test="navigation-item-transactions-removed"]').text()).toContain('Transações removidas')
  })

  it('opens only the group containing the active route and marks its child current', async () => {
    const wrapper = mount(AppNavigation, {
      props: { items, activeRoute: 'transactions' },
      global: stubs(),
    })

    expect(wrapper.findComponent({ name: 'ElMenu' }).props('defaultOpeneds')).toEqual(['cash-flow'])
    expect(wrapper.get('[data-test="navigation-item-transactions"]').attributes('aria-current')).toBe('page')

    await wrapper.setProps({ activeRoute: 'categories' })

    expect(wrapper.findComponent({ name: 'ElMenu' }).props('defaultOpeneds')).toEqual(['settings'])
    expect(wrapper.get('[data-test="navigation-item-categories"]').attributes('aria-current')).toBe('page')

    await wrapper.setProps({ activeRoute: 'financial-accounts-archived' })

    expect(wrapper.findComponent({ name: 'ElMenu' }).props('defaultOpeneds')).toEqual(['settings'])
    expect(wrapper.get('[data-test="navigation-item-financial-accounts"]').attributes('aria-current')).toBe('page')
  })

  it('emits selected route names without owning navigation', () => {
    const wrapper = mount(AppNavigation, {
      props: { items, activeRoute: 'protected-home' },
      global: stubs(),
    })

    wrapper.findComponent({ name: 'ElMenu' }).vm.$emit('select', 'transactions-removed')

    expect(wrapper.emitted('navigate')).toEqual([['transactions-removed']])
  })
})
