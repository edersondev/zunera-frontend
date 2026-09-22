import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus, { ElTag } from 'element-plus'
import TransactionStatusBadge from '../TransactionStatusBadge.vue'
import { i18n } from '@/i18n'

describe('TransactionStatusBadge', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it.each([
    ['effective', 'success', 'Efetiva'],
    ['pending', 'warning', 'Pendente'],
  ])('maps %s to semantic text, icon, and tone', (status, type, label) => {
    const wrapper = mount(TransactionStatusBadge, {
      props: { status },
      global: { plugins: [ElementPlus, i18n] },
    })
    const tag = wrapper.findComponent(ElTag)

    expect(tag.props('type')).toBe(type)
    expect(wrapper.text()).toContain(label)
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
