import { apiRequest } from './httpClient'

export async function getNotifications({ view = 'all', limit = 25, cursor = null, signal } = {}) {
  const response = await apiRequest({
    method: 'get',
    url: '/api/v1/notifications',
    params: { view, limit, ...(cursor ? { cursor } : {}) },
    signal,
  })

  return response.data
}

export async function getNotificationSummary() {
  const response = await apiRequest({ method: 'get', url: '/api/v1/notifications/summary' })
  return response.data.data
}

export async function markNotificationRead(id) {
  const response = await apiRequest({ method: 'patch', url: `/api/v1/notifications/${id}/read` }, { csrf: true })
  return response.data.data
}

export async function markAllNotificationsRead() {
  const response = await apiRequest({ method: 'post', url: '/api/v1/notifications/read-all' }, { csrf: true })
  return response.data.data
}

export async function openNotification(id) {
  const response = await apiRequest({ method: 'post', url: `/api/v1/notifications/${id}/open` }, { csrf: true })
  return response.data.data
}

export async function getNotificationPreferences() {
  const response = await apiRequest({ method: 'get', url: '/api/v1/notification-preferences' })
  return response.data.data
}

export async function updateNotificationPreference(category, enabled) {
  const response = await apiRequest({
    method: 'patch',
    url: `/api/v1/notification-preferences/${category}`,
    data: { enabled },
  }, { csrf: true })
  return response.data.data
}
