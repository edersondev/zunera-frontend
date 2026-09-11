import { afterEach, describe, expect, it } from 'vitest'
import { getStoredLocale, persistLocale } from '../locale'
import { i18n } from '..'

describe('locale bootstrap', () => {
  afterEach(() => window.localStorage.clear())

  it('defaults to PT-BR and falls back to English', () => {
    expect(getStoredLocale()).toBe('pt-BR')
    expect(i18n.global.fallbackLocale.value).toBe('en')
  })

  it('restores a supported locale selection', () => {
    persistLocale('en')
    expect(getStoredLocale()).toBe('en')
  })
})
