import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import CreditCardPurchaseForm from '../CreditCardPurchaseForm.vue'

vi.mock('@/services/categoryService', () => ({ listCategories: vi.fn() }))

const { listCategories } = await import('@/services/categoryService')

const stubs = {
  ElDialog: {
    name: 'ElDialog',
    props: ['modelValue', 'title'],
    emits: ['close'],
    template:
      '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>',
  },
  ElForm: { template: '<form><slot /></form>', methods: { clearValidate: vi.fn() } },
  ElFormItem: {
    props: ['label', 'error'],
    template:
      '<label><span>{{ label }}</span><slot /><small v-if="error">{{ error }}</small></label>',
  },
  ElRow: {
    props: ['gutter'],
    template: '<div class="credit-card-purchase-row" :data-gutter="gutter"><slot /></div>',
  },
  ElCol: {
    props: ['xs', 'md'],
    template: '<div class="credit-card-purchase-column" :data-xs="xs" :data-md="md"><slot /></div>',
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><slot /></select>',
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  CurrencyAmountInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input data-test="amount-input" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  ElDatePicker: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElInputNumber: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  ElAlert: { props: ['title'], template: '<aside role="alert">{{ title }}<slot /></aside>' },
  ElButton: {
    props: ['icon', 'loading', 'type', 'text'],
    emits: ['click'],
    template:
      '<button :disabled="loading" :data-icon="icon?.name" :data-type="type" @click="$emit(\'click\')"><slot /></button>',
  },
  InstallmentSchedule: {
    props: ['installments'],
    template:
      '<ul data-test="installment-schedule"><li v-for="item in installments" :key="item.sequence">{{ item.statement.closing_date }} {{ item.statement.due_date }}</li></ul>',
  },
}

const card = {
  id: 7,
  summary: { available_credit: { amount_centavos: 50_000 } },
}

function factory(props = {}) {
  return mount(CreditCardPurchaseForm, {
    props: { visible: true, card, ...props },
    global: { plugins: [i18n], stubs },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  listCategories.mockResolvedValue([
    { id: 3, name: 'Groceries', classification: 'expense', status: 'active' },
    { id: 4, name: 'Salary', classification: 'income', status: 'active' },
    { id: 5, name: 'Old expense', classification: 'expense', status: 'archived' },
  ])
})

describe('CreditCardPurchaseForm', () => {
  it('puts description first and pairs related fields from the medium breakpoint', () => {
    const wrapper = factory()
    const formItems = wrapper.findAll('label')
    const rows = wrapper.findAll('.credit-card-purchase-row')

    expect(formItems[0].text()).toContain('Descrição')
    expect(rows).toHaveLength(2)

    for (const row of rows) {
      const columns = row.findAll('.credit-card-purchase-column')

      expect(columns).toHaveLength(2)
      expect(columns.map((column) => column.attributes('data-xs'))).toEqual(['24', '24'])
      expect(columns.map((column) => column.attributes('data-md'))).toEqual(['12', '12'])
    }

    expect(rows[0].text()).toContain('Categoria')
    expect(rows[0].text()).toContain('Valor total')
    expect(rows[1].text()).toContain('Data da compra')
    expect(rows[1].text()).toContain('Parcelas')
  })

  it('submits integer centavos and only active expense categories', async () => {
    const wrapper = factory()
    await flushPromises()

    const selects = wrapper.findAll('select')
    expect(selects[0].text()).toContain('Groceries')
    expect(selects[0].text()).not.toContain('Salary')
    expect(selects[0].text()).not.toContain('Old expense')

    await selects[0].setValue('3')
    await wrapper.findAll('input').at(0).setValue('Headphones')
    await wrapper.get('[data-test="credit-card-purchase-amount"]').setValue('10000')
    await wrapper.find('input[type="date"]').setValue('2026-09-25')
    await wrapper.find('input[type="number"]').setValue('3')
    await wrapper.findAll('button').at(-1).trigger('click')

    expect(wrapper.emitted('submit')).toContainEqual([
      {
        category_id: 3,
        description: 'Headphones',
        notes: null,
        purchase_date: '2026-09-25',
        total_amount_centavos: 10_000,
        installment_count: 3,
      },
    ])
  })

  it('shows the server-assigned closing and due dates without recalculating them', () => {
    const wrapper = factory({
      createdPurchase: {
        installments: [
          {
            sequence: 1,
            statement: { closing_date: '2026-09-25', due_date: '2026-10-05' },
          },
        ],
      },
    })

    expect(wrapper.get('[data-test="installment-schedule"]').text()).toContain(
      '2026-09-25 2026-10-05',
    )
  })

  it('shows typed over-limit state with negative availability and emits explicit actions', async () => {
    const wrapper = factory({ overLimit: { resultingCentavos: -12_345 } })

    const warning = wrapper.get('[data-test="credit-card-purchase-over-limit"]')
    expect(warning.attributes('role')).toBe('alert')
    expect(warning.text()).toContain('-')

    await wrapper.get('[data-test="credit-card-purchase-confirm-over-limit"]').trigger('click')
    await wrapper.get('[data-test="credit-card-purchase-dismiss-over-limit"]').trigger('click')

    expect(wrapper.emitted('confirm-over-limit')).toHaveLength(1)
    expect(wrapper.emitted('dismiss-over-limit')).toHaveLength(1)
  })

  it('adds icons to every labelled form action', () => {
    const wrapper = factory({ overLimit: { resultingCentavos: -12_345 } })

    expect(
      wrapper.get('[data-test="credit-card-purchase-confirm-over-limit"]').attributes('data-icon'),
    ).toBe('Check')
    expect(
      wrapper.get('[data-test="credit-card-purchase-dismiss-over-limit"]').attributes('data-icon'),
    ).toBe('Close')
    expect(wrapper.get('[data-test="credit-card-purchase-cancel"]').attributes('data-icon')).toBe(
      'Close',
    )
    expect(wrapper.get('[data-test="credit-card-purchase-submit"]').attributes('data-icon')).toBe(
      'Check',
    )
  })

  it('renders category and amount feedback in labelled form items', async () => {
    const wrapper = factory({
      mutationError: {
        errors: {
          category_id: ['Choose an owned expense category.'],
          total_amount_centavos: ['Amount must be positive.'],
        },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Choose an owned expense category.')
    expect(wrapper.text()).toContain('Amount must be positive.')
  })

  it('dismisses server validation feedback when the dialog closes', async () => {
    const wrapper = factory({
      mutationError: { errors: { category_id: ['Choose an owned expense category.'] } },
    })

    await wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('close')

    expect(wrapper.emitted('dismiss-mutation-error')).toHaveLength(1)
    expect(wrapper.emitted('update:visible')).toContainEqual([false])
  })
})
