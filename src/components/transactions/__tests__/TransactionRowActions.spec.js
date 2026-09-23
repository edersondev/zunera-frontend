import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TransactionRowActions from '../TransactionRowActions.vue'

const transaction = { id: 7, status: 'effective' }

const stubs = {
  ElDropdown: {
    name: 'ElDropdown',
    emits: ['command'],
    template: '<div><slot /><slot name="dropdown" /></div>',
  },
  ElButton: {
    props: ['icon', 'disabled'],
    template: '<button :disabled="disabled"><component :is="icon" /></button>',
  },
  ElDropdownMenu: { template: '<menu><slot /></menu>' },
  ElDropdownItem: {
    props: ['disabled'],
    template: '<li :aria-disabled="disabled"><slot /></li>',
  },
  ElIcon: { template: '<i><slot /></i>' },
}

function mountActions(status = 'effective', saving = false, inline = false) {
  return mount(TransactionRowActions, {
    props: { transaction: { ...transaction, status }, saving, inline },
    global: { plugins: [i18n], stubs },
  })
}

describe('TransactionRowActions', () => {
  it('shows the three-dots trigger and the target status action with icons', () => {
    const wrapper = mountActions()

    expect(wrapper.get('[data-test="transaction-row-actions"] svg').exists()).toBe(true)
    expect(wrapper.get('[data-test="transaction-action-edit"]').text()).toBe('Editar')
    expect(wrapper.get('[data-test="transaction-action-status"]').text()).toBe('Pendente')
    expect(wrapper.get('[data-test="transaction-action-remove"]').text()).toBe('Remover')
    expect(wrapper.get('[data-test="transaction-action-remove"]').classes()).toContain(
      'transaction-remove-action',
    )
    expect(wrapper.findAll('svg')).toHaveLength(4)
  })

  it('emits the selected row action and opposite status', () => {
    const wrapper = mountActions('pending')
    const dropdown = wrapper.getComponent({ name: 'ElDropdown' })

    dropdown.vm.$emit('command', 'edit')
    dropdown.vm.$emit('command', 'status')
    dropdown.vm.$emit('command', 'remove')

    expect(wrapper.emitted('edit')).toEqual([[{ id: 7, status: 'pending' }]])
    expect(wrapper.emitted('update-status')).toEqual([[{ id: 7, status: 'pending' }, 'effective']])
    expect(wrapper.emitted('remove')).toEqual([[{ id: 7, status: 'pending' }]])
  })

  it('disables actions while a mutation is saving', () => {
    const wrapper = mountActions('effective', true)
    const dropdown = wrapper.getComponent({ name: 'ElDropdown' })

    expect(
      wrapper.get('[data-test="transaction-row-actions"]').attributes('disabled'),
    ).toBeDefined()
    expect(wrapper.get('[data-test="transaction-action-edit"]').attributes('aria-disabled')).toBe(
      'true',
    )

    dropdown.vm.$emit('command', 'status')
    expect(wrapper.emitted('update-status')).toBeUndefined()
  })

  it('stops the trigger click from reaching the table row', async () => {
    const onClick = vi.fn()
    const wrapper = mount(TransactionRowActions, {
      props: { transaction },
      attrs: { onClick },
      global: { plugins: [i18n], stubs },
    })

    await wrapper.get('[data-test="transaction-row-actions"]').trigger('click')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows inline actions and emits the same commands without a dropdown', async () => {
    const wrapper = mountActions('pending', false, true)

    expect(wrapper.findComponent({ name: 'ElDropdown' }).exists()).toBe(false)
    expect(wrapper.findAll('[data-test="transaction-inline-actions"] button')).toHaveLength(3)
    await wrapper.get('[data-test="transaction-action-edit"]').trigger('click')
    await wrapper.get('[data-test="transaction-action-status"]').trigger('click')
    await wrapper.get('[data-test="transaction-action-remove"]').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[{ id: 7, status: 'pending' }]])
    expect(wrapper.emitted('update-status')).toEqual([[{ id: 7, status: 'pending' }, 'effective']])
    expect(wrapper.emitted('remove')).toEqual([[{ id: 7, status: 'pending' }]])
  })

  it('disables inline actions while saving', () => {
    const wrapper = mountActions('effective', true, true)

    expect(
      wrapper
        .findAll('[data-test="transaction-inline-actions"] button')
        .every((button) => button.attributes('disabled') !== undefined),
    ).toBe(true)
  })
})
