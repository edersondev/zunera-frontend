import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import {
  categoryClassificationOptions,
  categoryColorOptions,
  categoryIconOptions,
} from '../categoryOptions'

describe('category options', () => {
  afterEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it('derives every visible label from active locale', () => {
    i18n.global.locale.value = 'en'

    expect(categoryClassificationOptions(i18n.global.t)[0].label).toBe('Income')
    expect(categoryColorOptions(i18n.global.t)[0].label).toBe('Teal')
    expect(categoryIconOptions(i18n.global.t)[0].label).toBe('Home')
  })
})
