import { describe, expect, it } from 'vitest'
import { inject, nextTick, provide, toRef } from 'vue'
import { mount } from '@vue/test-utils'
import CategoryList from '../CategoryList.vue'

const activeTabKey = Symbol('activeTab')
const ElTabsStub = {
  name: 'ElTabs',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props) {
    const activeTab = toRef(props, 'modelValue')

    provide(activeTabKey, activeTab)

    return { activeTab }
  },
  template: '<section :data-active-tab="activeTab"><slot /></section>',
}
const ElTabPaneStub = {
  props: ['label', 'name'],
  setup() {
    return { activeTab: inject(activeTabKey) }
  },
  template:
    '<section :data-tab-name="name"><span>{{ label }}</span><div v-if="activeTab === name" data-tab-content><slot /></div></section>',
}

describe('CategoryList', () => {
  it('filters categories by tabs while retaining default protections', async () => {
    const wrapper = mount(CategoryList, {
      props: {
        categories: [
          {
            id: 1,
            name: 'Food',
            origin: 'system',
            classification: 'expense',
            color: 'amber',
            icon: 'utensils',
          },
          {
            id: 2,
            name: 'Salary',
            origin: 'personal',
            classification: 'income',
            color: 'teal',
            icon: 'wallet',
          },
        ],
      },
      global: {
        directives: { loading: {} },
        stubs: {
          ElEmpty: { template: '<div><slot /></div>' },
          ElTabs: ElTabsStub,
          ElTabPane: ElTabPaneStub,
          ElTag: {
            props: ['type'],
            template: '<span :data-tag-type="type"><slot /></span>',
          },
          ElIcon: { template: '<span><slot /></span>' },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })
    expect(wrapper.text()).toContain('Padrão do sistema')
    expect(wrapper.text()).toContain('Despesa')
    expect(wrapper.text()).toContain('Receita')
    expect(wrapper.find('.category-card').text()).not.toContain('Arquivar')
    expect(wrapper.find('[data-active-tab="all"]').exists()).toBe(true)
    expect(
      wrapper.findAll('[data-tab-name]').map((tab) => tab.attributes('data-tab-name')),
    ).toEqual(['all', 'expense', 'income'])
    expect(wrapper.find('[data-tag-type="danger"]').text()).toBe('Despesa')
    const categoryColor = wrapper.find('[aria-label="Âmbar, Alimentação"]')

    expect(categoryColor.find('svg').exists()).toBe(true)
    expect(categoryColor.attributes('style')).toContain('var(--chart-amber')

    wrapper.findComponent(ElTabsStub).vm.$emit('update:modelValue', 'expense')
    await nextTick()

    expect(wrapper.find('[data-active-tab="expense"]').exists()).toBe(true)
    expect(wrapper.find('[data-tab-name="expense"] [data-tab-content]').text()).toContain('Food')
    expect(wrapper.find('[data-tab-name="expense"] [data-tab-content]').text()).not.toContain(
      'Salary',
    )

    wrapper.findComponent(ElTabsStub).vm.$emit('update:modelValue', 'income')
    await nextTick()

    expect(wrapper.find('[data-tab-name="income"] [data-tab-content]').text()).toContain('Salary')
    expect(wrapper.find('[data-tab-name="income"] [data-tab-content]').text()).not.toContain('Food')
  })
})
