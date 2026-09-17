import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import RecurringTransactionRowActions from '../RecurringTransactionRowActions.vue'

const stubs = {
  ElDropdown: {
    name: 'ElDropdown',
    emits: ['command'],
    template: '<div><slot /><slot name="dropdown" /></div>',
  },
  ElButton: {
    props: ['icon', 'disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><component :is="icon" /></button>',
  },
  ElDropdownMenu: { template: '<menu><slot /></menu>' },
  ElDropdownItem: {
    props: ['disabled'],
    template: '<li :aria-disabled="disabled"><slot /></li>',
  },
  ElIcon: { template: '<i><slot /></i>' },
}

function mountActions(state = 'active', saving = false) {
  return mount(RecurringTransactionRowActions, {
    props: { rule: { id: 7, state }, saving },
    global: { plugins: [i18n], stubs },
  })
}

describe('RecurringTransactionRowActions', () => {
  it('uses a three-dots menu with only the applicable lifecycle actions', () => {
    const wrapper = mountActions()

    expect(wrapper.get('[data-test="recurrence-row-actions"] svg').exists()).toBe(true)
    expect(wrapper.get('[data-test="recurrence-action-edit"]').text()).toBe('Editar')
    expect(wrapper.get('[data-test="recurrence-action-pause"]').text()).toBe('Pausar')
    expect(wrapper.get('[data-test="recurrence-action-end"]').text()).toBe('Encerrar')
    expect(wrapper.find('[data-test="recurrence-action-resume"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="recurrence-action-end"]').classes()).toContain('recurrence-end-action')
  })

  it('emits the selected action for the rule', () => {
    const wrapper = mountActions('paused')
    const dropdown = wrapper.getComponent({ name: 'ElDropdown' })

    dropdown.vm.$emit('command', 'edit')
    dropdown.vm.$emit('command', 'resume')
    dropdown.vm.$emit('command', 'end')

    expect(wrapper.emitted('edit')).toEqual([[{ id: 7, state: 'paused' }]])
    expect(wrapper.emitted('resume')).toEqual([[{ id: 7, state: 'paused' }]])
    expect(wrapper.emitted('end')).toEqual([[{ id: 7, state: 'paused' }]])
  })

  it('disables the menu while a mutation is pending and stops row clicks', async () => {
    const onClick = vi.fn()
    const wrapper = mount(RecurringTransactionRowActions, {
      props: { rule: { id: 7, state: 'active' }, saving: true },
      attrs: { onClick },
      global: { plugins: [i18n], stubs },
    })
    const dropdown = wrapper.getComponent({ name: 'ElDropdown' })

    expect(wrapper.get('[data-test="recurrence-row-actions"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="recurrence-action-edit"]').attributes('aria-disabled')).toBe('true')

    dropdown.vm.$emit('command', 'pause')
    expect(wrapper.emitted('pause')).toBeUndefined()

    await wrapper.get('[data-test="recurrence-row-actions"]').trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })
})
