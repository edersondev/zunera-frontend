import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountDataRestoreDialog from '../AccountDataRestoreDialog.vue'

const stubs = {
  ElDialog: { template: '<section><slot /><slot name="footer" /></section>' },
  ElAlert: { props: ['title'], template: '<p>{{ title }}</p>' },
  ElButton: { props: ['type', 'disabled'], template: '<button :data-type="type" :disabled="disabled"><slot /></button>' },
}

describe('archive restore confirmation', () => {
  it('names selected archive and explains current-data backup and retained copy', async () => {
    const wrapper = mount(AccountDataRestoreDialog, {
      props: { modelValue: true, archive: { id: 7, record_count: 12 } }, global: { stubs },
    })
    expect(wrapper.text()).toContain('12 registros')
    expect(wrapper.text()).toContain('salvos em um novo arquivo')
    expect(wrapper.text()).toContain('continuará disponível')
    expect(wrapper.findAll('button')[0].attributes('data-type')).toBe('danger')
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('shows localized rollback error and blocks repeated confirmation while busy', () => {
    const wrapper = mount(AccountDataRestoreDialog, {
      props: { modelValue: true, archive: { id: 7, record_count: 12 }, busy: true,
        error: { code: 'archive_restore_unavailable', message: 'English server message' } },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('não foram alterados')
    expect(wrapper.findAll('button')[0].attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('button')[1].attributes('disabled')).toBeDefined()
  })
})
