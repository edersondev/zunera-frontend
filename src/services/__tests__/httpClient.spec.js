import { afterEach, describe, expect, it } from 'vitest'
import { HttpClientError, httpClient, normalizeHttpError } from '../httpClient'
import { i18n } from '@/i18n'

describe('httpClient', () => {
  afterEach(() => {
    i18n.global.locale.value = 'pt-BR'
  })

  it('normalizes stable backend error payloads without secrets', () => {
    const error = normalizeHttpError({
      response: {
        status: 422,
        headers: { 'retry-after': '60' },
        data: {
          message: 'The given data was invalid.',
          code: 'recovery_link_invalid',
          errors: { email: ['Email is required.'] },
        },
      },
    })

    expect(error).toBeInstanceOf(HttpClientError)
    expect(error.status).toBe(422)
    expect(error.code).toBe('recovery_link_invalid')
    expect(error.retryAfter).toBe('60')
    expect(error.errors.email).toEqual(['Email is required.'])
  })

  it('sends the selected locale on API and CSRF requests', () => {
    i18n.global.locale.value = 'en'
    const interceptor = httpClient.interceptors.request.handlers.at(-1).fulfilled

    expect(interceptor({ headers: {} }).headers['Accept-Language']).toBe('en')
  })
})
