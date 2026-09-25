import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RecurringCardOccurrenceDialog from '../RecurringCardOccurrenceDialog.vue'

const stubs = {
  ElDialog: { props: ['modelValue', 'title'], template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /></section>' },
  ElForm: { template: '<form><slot /></form>' },
  ElFormItem: { props: ['label', 'error'], template: '<label>{{ label }}<slot /><span v-if="error" role="alert">{{ error }}</span></label>' },
  CurrencyAmountInput: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />' },
  ElDatePicker: { props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  ElSelect: { props: ['modelValue'], emits: ['update:modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><slot /></select>' },
  ElOption: { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' },
  ElCheckbox: { props: ['modelValue'], emits: ['update:modelValue'], template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /><slot /></label>' },
  ElButton: { props: ['disabled', 'loading'], emits: ['click'], template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
  ElTag: { template: '<span><slot /></span>' },
  ElAlert: { props: ['title'], template: '<div role="alert">{{ title }}</div>' },
}

const cards = [
  { id: 2, name: 'Principal', institution_name: 'Nubank', last_four: '1234', status: 'active', summary: { available_credit: { amount_centavos: 1000 } } },
  { id: 3, name: 'Reserva', institution_name: 'Visa', last_four: '4321', status: 'active', summary: { available_credit: { amount_centavos: 9000 } } },
]
const categories = [
  { id: 4, name: 'Academia', status: 'active', classification: 'expense' },
  { id: 5, name: 'Saúde', status: 'active', classification: 'expense' },
]
const occurrence = {
  id: 9, state: 'expected', generation_mode: 'confirmation', scheduled_date: '2026-09-01',
  scheduled_amount_centavos: 15000, actual_amount_centavos: null, actual_purchase_date: null,
  card: cards[0], category: categories[0], purchase_id: null,
}

function mountDialog(props = {}) {
  return mount(RecurringCardOccurrenceDialog, {
    props: { modelValue: true, occurrence, cards, categories, ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('RecurringCardOccurrenceDialog', () => {
  it('confirms one date with explicit amount, date, card, and category overrides', async () => {
    const wrapper = mountDialog()
    await wrapper.get('[data-test="occurrence-amount"]').setValue('16500')
    await wrapper.get('[data-test="occurrence-date"]').setValue('2026-09-13')
    await wrapper.get('[data-test="occurrence-card"]').setValue('3')
    await wrapper.get('[data-test="occurrence-category"]').setValue('5')
    await wrapper.get('[data-test="occurrence-confirm"]').trigger('click')

    expect(wrapper.emitted('confirm')[0][0]).toMatchObject({
      actual_amount_centavos: 16500, actual_purchase_date: '2026-09-13',
      credit_card_id: 3, category_id: 5,
    })
    expect(wrapper.get('[data-test="occurrence-recording-scope"]').text()).toContain('Não confirma uma cobrança')
  })

  it('keeps failed choices and validation feedback visible for a revised retry', async () => {
    const wrapper = mountDialog({
      occurrence: { ...occurrence, state: 'failed', actual_amount_centavos: 16500, actual_purchase_date: '2026-09-13' },
      errors: { actual_purchase_date: ['A data não pode ser futura.'] },
    })

    expect(wrapper.get('[data-test="occurrence-failed"]').text()).toContain('Suas escolhas foram mantidas')
    expect(wrapper.get('[data-test="occurrence-amount"]').element.value).toBe('16500')
    expect(wrapper.get('[data-test="occurrence-date"]').element.value).toBe('2026-09-13')
    expect(wrapper.get('[role="alert"]').text()).toContain('Suas escolhas foram mantidas')
    expect(wrapper.text()).toContain('A data não pode ser futura.')
    await wrapper.get('[data-test="occurrence-amount"]').setValue('17000')
    await wrapper.get('[data-test="occurrence-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')[0][0].actual_amount_centavos).toBe(17000)
  })

  it('requires explicit over-limit approval and sends the reviewed available credit', async () => {
    const wrapper = mountDialog({ error: { code: 'OVER_LIMIT_CONFIRMATION_REQUIRED' } })
    const confirm = wrapper.get('[data-test="occurrence-confirm"]')
    expect(confirm.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="occurrence-over-limit-approval"] input').setValue(true)
    await confirm.trigger('click')

    expect(wrapper.emitted('confirm')[0][0]).toMatchObject({
      confirm_over_limit: true, expected_available_credit_centavos: 1000,
    })
  })

  it('rejects a future purchase date and explains stale credit without losing the form', async () => {
    const wrapper = mountDialog({ error: { code: 'stale_over_limit_confirmation' } })
    await wrapper.get('[data-test="occurrence-date"]').setValue('2099-01-01')
    expect(wrapper.get('[data-test="occurrence-future-date"]').text()).toContain('não pode estar no futuro')
    expect(wrapper.get('[data-test="occurrence-confirm"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="occurrence-stale-credit"]').text()).toContain('O limite disponível mudou')
    expect(wrapper.find('[data-test="occurrence-amount"]').exists()).toBe(true)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('reviews automatic approval, dismissal, retryable conflict, and recorded origin', async () => {
    const awaiting = mountDialog({
      occurrence: { ...occurrence, generation_mode: 'automatic', state: 'awaiting_over_limit' },
      error: { code: 'occurrence_action_in_progress' },
    })
    expect(awaiting.find('[data-test="occurrence-amount"]').exists()).toBe(false)
    expect(awaiting.get('[data-test="occurrence-action-in-progress"]').text()).toContain('Outra tentativa')
    await awaiting.get('[data-test="occurrence-dismiss"]').trigger('click')
    expect(awaiting.emitted('dismiss')).toHaveLength(1)

    const failed = mountDialog({ occurrence: { ...occurrence, generation_mode: 'automatic', state: 'failed' } })
    await failed.get('[data-test="occurrence-retry"]').trigger('click')
    expect(failed.emitted('retry')).toHaveLength(1)

    const recorded = mountDialog({ occurrence: { ...occurrence, state: 'recorded', purchase_id: 81 } })
    expect(recorded.get('[data-test="occurrence-recorded-origin"]').text()).toContain('#81')
    expect(recorded.find('[data-test="occurrence-confirm"]').exists()).toBe(false)
  })
})
