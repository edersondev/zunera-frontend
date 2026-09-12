import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TransactionRemoveDialog from '../TransactionRemoveDialog.vue'

const stubs = {
  ElDialog: {
    props: ['modelValue', 'title'],
    template: '<section v-if="modelValue" role="dialog" :aria-label="title"><slot /><footer><slot name="footer" /></footer></section>',
  },
  ElButton: {
    props: ['icon', 'type'],
    emits: ['click'],
    template: '<button :data-type="type" @click="$emit(\'click\')"><component :is="icon" /><slot /></button>',
  },
}

describe('TransactionRemoveDialog', () => {
  it('uses icons on both actions and a danger cancel action', async () => {
    const wrapper = mount(TransactionRemoveDialog, {
      props: { visible: true, transaction: { id: 1, description: 'Almoço' } },
      global: { plugins: [i18n], stubs },
    })

    expect(wrapper.get('[data-test="cancel-remove"]').attributes('data-type')).toBe('danger')
    expect(wrapper.get('[data-test="confirm-remove"]').attributes('data-type')).toBe('info')
    expect(wrapper.get('[data-test="cancel-remove"] svg').exists()).toBe(true)
    expect(wrapper.get('[data-test="confirm-remove"] svg').exists()).toBe(true)

    await wrapper.get('[data-test="cancel-remove"]').trigger('click')
    expect(wrapper.emitted('update:visible')).toEqual([[false]])

    await wrapper.get('[data-test="confirm-remove"]').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})
