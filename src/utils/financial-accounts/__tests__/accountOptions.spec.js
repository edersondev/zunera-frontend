import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import { accountColorOptions, accountIconOptions, accountTypeOptions } from '../accountOptions'

describe('financial account options', () => {
  afterEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it('derives every visible label from active locale', () => {
    i18n.global.locale.value = 'en'

    expect(accountTypeOptions(i18n.global.t)[0].label).toBe('Checking account')
    expect(accountColorOptions(i18n.global.t)[0].label).toBe('Teal')
    expect(accountIconOptions(i18n.global.t)[0].label).toBe('Bank')
  })
})
