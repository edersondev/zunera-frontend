import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { nextTick } from 'vue'
import { i18n } from '@/i18n'
import RecurringTransactionList from '../RecurringTransactionList.vue'

const stubs = {}

function rule(overrides = {}) {
  return {
    id: 1,
    description: 'Aluguel',
    frequency: 'monthly',
    state: 'active',
    paused_reason: null,
    amount_centavos: 120000,
    next_expected_occurrence: '2026-10-05',
    financial_account: { id: 1, name: 'Conta', status: 'active' },
    category: { id: 2, name: 'Moradia', status: 'active' },
    ...overrides,
  }
}

async function factory(rules, props = {}) {
  const wrapper = mount(RecurringTransactionList, {
    props: { rules, ...props },
    global: { plugins: [i18n, ElementPlus], stubs },
  })

  await nextTick()
  await nextTick()

  return wrapper
}

describe('RecurringTransactionList', () => {
  it('shows the empty state when nothing matches', async () => {
    const wrapper = await factory([])

    expect(wrapper.text()).toContain('Nenhuma recorrência encontrada.')
  })

  it('communicates state, next date, and amount without relying on color', async () => {
    const wrapper = await factory([rule()])

    const text = wrapper.text()
    expect(text).toContain('Aluguel')
    expect(text).toContain('Ativa')
    expect(text).toMatch(/05\/10\/2026/)
    expect(text).toContain('1.200,00')
  })

  it('explains an archived association and exposes lifecycle actions', async () => {
    const paused = await factory([
      rule({ state: 'paused', paused_reason: 'association_archived', next_expected_occurrence: null }),
      rule({ id: 2, state: 'ended' }),
    ])

    const text = paused.text()
    expect(text).toContain('Pausada por conta ou categoria arquivada')
    expect(text).toContain('Reassocie uma conta e categoria ativas antes de retomar.')
    expect(text).toContain('Retomar')
    expect(text).toContain('Encerrada')
  })

  it('emits load-more only when another page exists', async () => {
    const wrapper = await factory([rule()], { hasMore: true })

    await wrapper.find('[data-test="recurrence-load-more"]').trigger('click')
    expect(wrapper.emitted('load-more')).toHaveLength(1)
  })
})
