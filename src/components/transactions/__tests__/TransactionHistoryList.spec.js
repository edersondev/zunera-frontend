import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import TransactionHistoryList from '../TransactionHistoryList.vue'
import { i18n } from '@/i18n'

const transaction = {
  id: 1,
  movement_kind: 'income',
  type: 'income',
  status: 'effective',
  description: 'Salário',
  amount_centavos: 500_000,
  movement_date: '2026-09-11',
  financial_account: { id: 1, name: 'Conta principal', status: 'active' },
  category: { id: 2, name: 'Salário', status: 'active' },
}
const transfer = {
  id: 2,
  movement_kind: 'transfer',
  status: 'pending',
  description: 'Reserva',
  amount_centavos: 100_000,
  movement_date: '2026-09-10',
  source_financial_account: { id: 1, name: 'Conta principal', status: 'active' },
  destination_financial_account: { id: 3, name: 'Poupança', status: 'active' },
  category: null,
}
const cardExpense = {
  id: 3,
  movement_kind: 'credit_card_expense',
  type: 'expense',
  status: 'effective',
  description: 'Mercado',
  amount_centavos: 20_000,
  movement_date: '2026-09-09',
  credit_card: { id: 1, name: 'Cartão teal', status: 'active' },
  category: { id: 4, name: 'Alimentação', status: 'active' },
}

const actionStubs = {
  TransactionRowActions: {
    props: ['transaction'],
    template: '<button data-test="transaction-action-stub">actions {{ transaction.id }}</button>',
  },
  TransferRowActions: {
    props: ['transfer'],
    template: '<button data-test="transfer-action-stub">actions {{ transfer.id }}</button>',
  },
}

function mountList(props = {}) {
  return mount(TransactionHistoryList, {
    props: {
      items: [transaction, transfer, cardExpense],
      meta: { total: 3 },
      loading: false,
      transactionSaving: false,
      transferSaving: false,
      hasMore: false,
      filtered: false,
      ...props,
    },
    global: { plugins: [ElementPlus, i18n], stubs: actionStubs },
  })
}

describe('TransactionHistoryList', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it('renders desktop and mobile presentations with identical financial meaning', () => {
    const wrapper = mountList()
    const mobileIncome = wrapper.findAll('.mobile-item')[0]

    expect(wrapper.findAll('.el-table__row')).toHaveLength(3)
    expect(wrapper.findAll('.mobile-item')).toHaveLength(3)
    expect(mobileIncome.find('.movement-label').exists()).toBe(false)
    expect(mobileIncome.get('.income-amount').text()).toContain('+ R$\u00a05.000,00')
    expect(wrapper.get('[data-test="mobile-transfer-history-route"]').text()).toBe(
      'Conta principal → Poupança',
    )
    expect(wrapper.get('[data-test="mobile-transfer-history-amount"]').text()).toContain(
      'R$ 1.000,00',
    )
    expect(wrapper.get('[data-test="mobile-transfer-history-amount"]').text()).not.toContain(
      'Conta',
    )
    expect(wrapper.get('[data-test="mobile-transfer-history-no-category"]').text()).toBe('—')
    expect(wrapper.get('[data-test="transaction-status-pending"]').text()).toContain('Pendente')
  })

  it('keeps recognized card expenses read-only in history', () => {
    const wrapper = mountList()
    const cardRow = wrapper.findAll('.mobile-item')[2]

    expect(cardRow.text()).toContain('Mercado')
    expect(cardRow.text()).toContain('Despesa reconhecida')
    expect(cardRow.text()).toContain('Cartão teal')
    expect(cardRow.find('[data-test="transaction-action-stub"]').exists()).toBe(false)
    expect(cardRow.find('[data-test="transfer-action-stub"]').exists()).toBe(false)
  })

  it('emits selection from accessible mobile transaction control', async () => {
    const wrapper = mountList()

    await wrapper.findAll('.mobile-description-button')[0].trigger('click')

    expect(wrapper.emitted('select')[0][0]).toEqual(transaction)
  })

  it('offers contextual recovery for filtered and unfiltered empty states', async () => {
    const wrapper = mountList({ items: [], meta: { total: 0 }, filtered: true })

    expect(wrapper.text()).toContain('Nenhuma transação corresponde aos filtros atuais.')
    await wrapper.get('[data-test="empty-clear-filters"]').trigger('click')
    expect(wrapper.emitted('clear-filters')).toHaveLength(1)

    await wrapper.setProps({ filtered: false })
    expect(wrapper.text()).toContain('Nenhuma transação cadastrada ainda.')
    await wrapper.get('[data-test="empty-create-transaction"]').trigger('click')
    expect(wrapper.emitted('create')).toHaveLength(1)
  })
})
