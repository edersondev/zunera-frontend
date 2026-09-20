import axios from 'axios'
import { i18n } from '@/i18n'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001'

export class HttpClientError extends Error {
  constructor(message, { status = 0, code = null, errors = {}, retryAfter = null, payload = null } = {}) {
    super(message)
    this.name = 'HttpClientError'
    this.status = status
    this.code = code
    this.errors = errors
    this.retryAfter = retryAfter
    // Typed error bodies (for example the credit-card over-limit confirmation)
    // keep their extra fields so callers never parse the message text.
    this.payload = payload
  }
}

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

httpClient.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.global.locale.value
  return config
})

let csrfPromise = null

export async function refreshCsrfCookie() {
  csrfPromise ??= httpClient.get('/sanctum/csrf-cookie').finally(() => {
    csrfPromise = null
  })

  return csrfPromise
}

export function normalizeHttpError(error) {
  const response = error?.response
  const data = response?.data ?? {}

  return new HttpClientError(data.message ?? 'Request failed.', {
    status: response?.status ?? 0,
    code: data.code ?? null,
    errors: data.errors ?? {},
    retryAfter: response?.headers?.['retry-after'] ?? null,
    payload: data,
  })
}

export async function apiRequest(config, { csrf = false } = {}) {
  if (csrf) {
    await refreshCsrfCookie()
  }

  try {
    return await httpClient.request(config)
  } catch (error) {
    if (csrf && error?.response?.status === 419) {
      await refreshCsrfCookie()
      return httpClient.request(config)
    }

    throw normalizeHttpError(error)
  }
}
