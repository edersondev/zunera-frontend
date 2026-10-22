import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { i18n } from '@/i18n'
import CreditCardPurchaseMoveDialog from '../CreditCardPurchaseMoveDialog.vue'

const purchase = {
  id: 3, description: 'Groceries', purchase_date: '2026-09-05', installment_count: 2,
  card: { id: 7 }, installments: [{ id: 31, sequence: 1 }, { id: 32, sequence: 2 }],
}
const options = {
  options: [{ period_from: '2026-10-11', period_to: '2026-11-10', closing_date: '2026-11-10', due_date: '2026-11-17' }], next_from_month: '2026-12',
}
const stubs = {
  ElDialog: { props: ['modelValue', 'title'], template: '<div v-if="modelValue" role="dialog" :aria-label="title"><slot /><slot name="footer" /></div>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { props: ['label', 'error'], template: '<label>{{ label }}<slot /><small v-if="error">{{ error }}</small></label>' },
  ElRadioGroup: { props: ['modelValue'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>' },
  ElRadio: { props: ['value'], template: '<option :value="value"><slot /></option>' },
  ElSelect: { props: ['modelValue', 'disabled'], emits: ['update:modelValue'], template: '<select :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', /^\\d+$/.test($event.target.value) ? Number($event.target.value) : $event.target.value)"><option value=""></option><slot /></select>' },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}</aside>' },
  ElButton: { props: ['disabled', 'loading'], emits: ['click'], template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>' },
}

function factory(extra = {}) {
  return mount(CreditCardPurchaseMoveDialog, {
    props: { visible: true, purchase, options, ...extra },
    global: { plugins: [i18n], stubs },
  })
}

describe('CreditCardPurchaseMoveDialog', () => {
  it('defaults to a full schedule move and waits for server preview before confirmation', async () => {
    const wrapper = factory({ visible: false })
    await wrapper.setProps({ visible: true })
    expect(wrapper.get('[data-test="credit-card-move-mode"]').element.value).toBe('full_schedule')
    expect(wrapper.get('[data-test="credit-card-move-confirm"]').element.disabled).toBe(true)
    await wrapper.get('[data-test="credit-card-move-target"]').setValue('2026-11-10')
    expect(wrapper.get('[data-test="credit-card-move-target"]').text()).toContain('17/11/2026')
    await wrapper.get('[data-test="credit-card-move-preview-button"]').trigger('click')
    expect(wrapper.emitted('request-preview')[0][0]).toEqual({ mode: 'full_schedule', target_closing_date: '2026-11-10' })
    await wrapper.setProps({ previewLoading: true, preview: { preview_token: 'token' } })
    expect(wrapper.get('[data-test="credit-card-move-confirm"]').element.disabled).toBe(true)
  })

  it('requests options, preselects a clicked installment, and previews the chosen target', async () => {
    const wrapper = factory({ visible: false, initialInstallmentId: 32 })
    await wrapper.setProps({ visible: true })
    expect(wrapper.emitted('request-options')[0][0]).toMatchObject({ cardId: 7, purchaseDate: '2026-09-05' })
    expect(wrapper.get('[data-test="credit-card-move-mode"]').element.value).toBe('one_installment')
    expect(wrapper.get('[data-test="credit-card-move-installment"]').element.value).toBe('32')
    await wrapper.get('[data-test="credit-card-move-target"]').setValue('2026-11-10')
    await wrapper.get('[data-test="credit-card-move-preview-button"]').trigger('click')
    expect(wrapper.emitted('request-preview')[0][0]).toEqual({
      mode: 'one_installment', installment_id: 32, target_closing_date: '2026-11-10',
    })
    await wrapper.get('[data-test="credit-card-move-more"]').trigger('click')
    expect(wrapper.emitted('request-options').at(-1)[0].fromMonth).toBe('2026-12')
  })

  it('shows authoritative preview amounts and blocks confirmation while loading', async () => {
    const wrapper = factory({ preview: {
      preview_token: 'token',
      affected_installments: [{ installment_id: 31, sequence: 1, amount_centavos: 5_000, source: { period_from: '2026-09-11', period_to: '2026-10-10', closing_date: '2026-10-10', due_date: '2026-10-17' }, destination: { period_from: '2026-10-11', period_to: '2026-11-10', closing_date: '2026-11-10', due_date: '2026-11-17' } }],
      affected_statements: [{ closing_date: '2026-11-10', charge_before_centavos: 1_000, charge_after_centavos: 6_000, outstanding_after_centavos: 2_000, payment_surplus_after_centavos: 3_000 }],
    } })
    expect(wrapper.get('[data-test="credit-card-move-preview"]').text()).toContain('60,00')
    expect(wrapper.get('[data-test="credit-card-move-preview"]').text()).toContain('30,00')
    expect(wrapper.get('[data-test="credit-card-move-preview"]').text()).toContain('11/09/2026–10/10/2026')
    expect(wrapper.get('[data-test="credit-card-move-preview"]').text()).toContain('17/11/2026')
    await wrapper.setProps({ submitting: true })
    expect(wrapper.get('[data-test="credit-card-move-confirm"]').element.disabled).toBe(true)
    await wrapper.setProps({ submitting: false, previewError: { code: 'STALE_MOVE_PREVIEW' } })
    expect(wrapper.get('[data-test="credit-card-move-error"]').text()).toContain('nova prévia')
  })

  it('shows history and returns focus to the launching action', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const wrapper = factory({ visible: false, history: [{ id: 1, mode: 'one_installment', sequence: 2, moved_at: '2026-09-20T12:00:00Z', source: { period_from: '2026-09-11', period_to: '2026-10-10', closing_date: '2026-10-10', due_date: '2026-10-17' }, destination: { period_from: '2026-10-11', period_to: '2026-11-10', closing_date: '2026-11-10', due_date: '2026-11-17' } }] })
    await wrapper.setProps({ visible: true })
    expect(wrapper.get('[data-test="credit-card-move-history"]').text()).toContain('10/11/2026')
    expect(wrapper.get('[data-test="credit-card-move-history"]').text()).toContain('Parcela 2/2')
    expect(wrapper.get('[data-test="credit-card-move-history"]').text()).toContain('17/11/2026')
    expect(wrapper.get('[data-test="credit-card-move-history"]').text()).toContain('Movida em')
    await wrapper.setProps({ visible: false })
    await nextTick()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('focuses a persistent page action when the launching statement row disappears', async () => {
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
