import { afterEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { i18n } from '@/i18n'
import PrivacyNoticeView from '@/views/legal/PrivacyNoticeView.vue'
import PrivacyRightsView from '@/views/legal/PrivacyRightsView.vue'

const options = { global: { stubs: { RouterLink: RouterLinkStub } } }

afterEach(() => {
  i18n.global.locale.value = 'pt-BR'
  window.localStorage.clear()
})

describe('Public privacy pages', () => {
  it('explains data handling and links to rights from the notice', () => {
    const wrapper = mount(PrivacyNoticeView, options)

    expect(wrapper.get('h1').text()).toBe('Aviso de privacidade')
    expect(wrapper.text()).toContain('Dados financeiros que você registra')
    expect(wrapper.text()).toContain('Tokens de recuperação, sessões')
    expect(wrapper.findAllComponents(RouterLinkStub).some((link) => link.props('to')?.name === 'privacy-rights')).toBe(true)
  })

  it('lists LGPD rights and explains current request path without inventing a contact address', () => {
    const wrapper = mount(PrivacyRightsView, options)

    expect(wrapper.get('h1').text()).toBe('Direitos de privacidade')
    expect(wrapper.text()).toContain('Confirmação de tratamento e acesso')
    expect(wrapper.text()).toContain('formulário dedicado')
    expect(wrapper.get('a[href^="https://www.gov.br/anpd/"]').attributes('rel')).toBe('noopener noreferrer')
  })

  it('shows English content after language switch', async () => {
    const wrapper = mount(PrivacyRightsView, options)

    await wrapper.get('#legal-language').setValue('en')

    expect(wrapper.get('h1').text()).toBe('Privacy rights')
    expect(wrapper.text()).toContain('A dedicated form for other privacy requests')
  })
})
