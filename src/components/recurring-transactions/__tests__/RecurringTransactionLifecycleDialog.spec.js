import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RecurringTransactionLifecycleDialog from '../RecurringTransactionLifecycleDialog.vue'

const stubs = {
  ElDialog: {
    props: ['modelValue', 'title'],
    template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><slot name="footer" /></section>',
  },
  ElAlert: { props: ['title'], template: '<div class="alert">{{ title }}</div>' },
  ElButton: {
    props: ['icon', 'type', 'disabled'],
    emits: ['click'],
    template: '<button type="button" :data-type="type" :disabled="disabled" @click="$emit(\'click\')"><component :is="icon" /><slot /></button>',
  },
}

const rule = { id: 3, description: 'Academia', paused_reason: null }

function factory(props = {}) {
  return mount(RecurringTransactionLifecycleDialog, {
    props: { modelValue: true, rule, ...props },
    global: { plugins: [i18n], stubs },
  })
}

describe('RecurringTransactionLifecycleDialog', () => {
  it('uses the standard danger cancel action with a close icon', () => {
    const wrapper = factory({ saving: true })
    const cancel = wrapper.get('[data-test="recurrence-lifecycle-cancel"]')

    expect(cancel.attributes('data-type')).toBe('danger')
    expect(cancel.attributes('disabled')).toBeDefined()
    expect(cancel.find('svg').exists()).toBe(true)
  })

  it('explains that paused dates stay skipped when resuming', () => {
    const wrapper = factory({ action: 'resume' })

    expect(wrapper.find('[role="dialog"]').attributes('aria-label')).toBe('Retomar recorrência')
    expect(wrapper.get('[data-test="recurrence-lifecycle-confirm"] svg').exists()).toBe(true)
    expect(wrapper.find('[data-test="recurrence-lifecycle-description"]').text()).toContain(
      'continuam ignoradas',
    )
  })

  it('shows a pause icon on the pause confirmation action', () => {
    const wrapper = factory({ action: 'pause' })

    expect(wrapper.get('[data-test="recurrence-lifecycle-confirm"] svg').exists()).toBe(true)
  })

  it('states that ending is permanent and keeps history', () => {
    const wrapper = factory({ action: 'end' })

    expect(wrapper.find('[data-test="recurrence-lifecycle-description"]').text()).toContain('definitiva')
    expect(wrapper.find('[data-test="recurrence-lifecycle-description"]').text()).toContain('histórico')
  })

  it('explains the archived association repair requirement and surfaces errors', () => {
    const wrapper = factory({
      action: 'resume',
      rule: { ...rule, paused_reason: 'association_archived' },
      error: 'Provide an eligible active account and matching category before resuming.',
    })

    expect(wrapper.find('[data-test="recurrence-lifecycle-repair"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="recurrence-lifecycle-error"]').text()).toContain(
      'eligible active account',
    )
  })

  it('emits confirm and close events', async () => {
    const wrapper = factory({ action: 'pause' })

    await wrapper.find('[data-test="recurrence-lifecycle-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)

    await wrapper.find('[data-test="recurrence-lifecycle-cancel"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
  })
})
