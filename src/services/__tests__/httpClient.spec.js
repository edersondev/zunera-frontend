import { describe, expect, it } from 'vitest'
import { HttpClientError, normalizeHttpError } from '../httpClient'

describe('httpClient', () => {
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
})
