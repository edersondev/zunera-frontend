import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { i18n } from '@/i18n'
import CreditCardPurchaseDeleteDialog from '../CreditCardPurchaseDeleteDialog.vue'

const stubs = {
  ElDialog: { props: ['modelValue', 'title'], template: '<div v-if="modelValue" role="dialog" :aria-label="title"><slot /><slot name="footer" /></div>' },
  ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}</aside>' },
  ElButton: { props: ['disabled', 'loading'], emits: ['click'], template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>' },
}
const purchase = { id: 3, description: 'Groceries', installment_count: 4 }

function factory(extra = {}) {
  return mount(CreditCardPurchaseDeleteDialog, {
    props: { visible: true, purchase, ...extra }, global: { plugins: [i18n], stubs },
  })
}

describe('CreditCardPurchaseDeleteDialog', () => {
  it('names the purchase, warns about permanent removal, and requires confirmation', async () => {
    const wrapper = factory()
    expect(wrapper.get('[data-test="credit-card-delete-warning"]').text()).toContain('Groceries')
    expect(wrapper.get('[data-test="credit-card-delete-warning"]').text()).toContain('4 parcela')
    await wrapper.get('[data-test="credit-card-delete-cancel"]').trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.emitted('update:visible')).toEqual([[false]])
    await wrapper.get('[data-test="credit-card-delete-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('disables the action while submitting and explains linked credits', () => {
    const wrapper = factory({ submitting: true, mutationError: { code: 'PURCHASE_HAS_LINKED_CREDITS' } })
    expect(wrapper.get('[data-test="credit-card-delete-confirm"]').element.disabled).toBe(true)
    expect(wrapper.get('[data-test="credit-card-delete-error"]').text()).toContain('estornos vinculados')
  })

  it('returns focus when dismissed', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const wrapper = factory({ visible: false })
    await wrapper.setProps({ visible: true })
    await wrapper.setProps({ visible: false })
    await nextTick()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('focuses a persistent page action after deleting the launching row', async () => {
    const trigger = document.createElement('button')
    const fallback = document.createElement('button')
    fallback.setAttribute('data-test', 'credit-card-statement-back')
    document.body.append(trigger, fallback)
    trigger.focus()
    const wrapper = factory({ visible: false, focusFallbackSelector: '[data-test="credit-card-statement-back"]' })
    await wrapper.setProps({ visible: true })
    trigger.remove()
    await wrapper.setProps({ visible: false })
    await nextTick()
    expect(document.activeElement).toBe(fallback)
    fallback.remove()
  })
})
