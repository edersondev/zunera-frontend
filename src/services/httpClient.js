import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001'

export class HttpClientError extends Error {
  constructor(message, { status = 0, code = null, errors = {}, retryAfter = null } = {}) {
    super(message)
    this.name = 'HttpClientError'
    this.status = status
    this.code = code
    this.errors = errors
    this.retryAfter = retryAfter
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
