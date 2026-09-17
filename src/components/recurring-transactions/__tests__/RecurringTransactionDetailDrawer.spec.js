import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RecurringTransactionDetailDrawer from '../RecurringTransactionDetailDrawer.vue'

const stubs = {
  ElDrawer: {
    props: ['modelValue', 'title'],
    template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /></section>',
  },
  ElDescriptions: { template: '<dl><slot /></dl>' },
  ElDescriptionsItem: {
    props: ['label'],
    template: '<div><dt>{{ label }}</dt><dd><slot /></dd></div>',
  },
  ElAlert: { props: ['title'], template: '<div class="alert">{{ title }}</div>' },
  ElTable: { props: ['data'], template: '<table :data-rows="data.length"><slot /></table>' },
  ElTableColumn: { template: '<td><slot :row="{}" /></td>' },
  ElTag: { template: '<span class="tag"><slot /></span>' },
  ElButton: {
    emits: ['click'],
    template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
  },
}

const rule = {
  id: 3,
  description: 'Academia',
  type: 'expense',
  state: 'paused',
  paused_reason: 'association_archived',
  frequency: 'monthly',
  amount_centavos: 9900,
  start_date: '2026-02-01',
  end_date: null,
  next_expected_occurrence: null,
  generated_occurrence_count: 4,
  financial_account: { id: 1, name: 'Conta antiga', status: 'archived' },
  category: { id: 2, name: 'Saúde', classification: 'expense', status: 'archived' },
}

describe('RecurringTransactionDetailDrawer', () => {
  it('explains an archived association and shows the generated occurrence count', () => {
    const wrapper = mount(RecurringTransactionDetailDrawer, {
      props: { modelValue: true, rule, occurrences: [], loadingOccurrences: false },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.find('[data-test="recurrence-detail-repair"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recurrence-detail-count"]').text()).toBe('4')
    expect(wrapper.find('[data-test="recurrence-detail-type"]').text()).toBe('Despesa')
    expect(wrapper.find('[data-test="recurrence-detail-next"]').text()).toBe(
      'Sem próxima ocorrência',
    )
    expect(wrapper.find('[data-test="recurrence-detail-state"]').text()).toBe(
      'Pausada por conta ou categoria arquivada',
    )
    expect(wrapper.find('[data-test="recurrence-occurrence-scope"]').exists()).toBe(true)
  })

  it('renders the empty occurrence state until something is generated', () => {
    const wrapper = mount(RecurringTransactionDetailDrawer, {
      props: {
        modelValue: true,
        rule: { ...rule, generated_occurrence_count: 0 },
        occurrences: [],
        loadingOccurrences: false,
      },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.find('[data-test="recurrence-occurrences-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recurrence-detail-count"]').text()).toBe('0')
  })
})
