import { apiRequest } from './httpClient'

function data(response) {
  return response.data.data
}

export async function listCategories(status = 'active') {
  return data(await apiRequest({ method: 'get', url: '/api/v1/categories', params: { status } }))
}
export async function getCategory(id) {
  return data(await apiRequest({ method: 'get', url: `/api/v1/categories/${id}` }))
}
export async function createCategory(payload) {
  return data(
    await apiRequest({ method: 'post', url: '/api/v1/categories', data: payload }, { csrf: true }),
  )
}
export async function updateCategory(id, payload) {
  return data(
    await apiRequest(
      { method: 'patch', url: `/api/v1/categories/${id}`, data: payload },
      { csrf: true },
    ),
  )
}
export async function archiveCategory(id) {
  return data(
    await apiRequest({ method: 'post', url: `/api/v1/categories/${id}/archive` }, { csrf: true }),
  )
}
export async function restoreCategory(id) {
  return data(
    await apiRequest({ method: 'post', url: `/api/v1/categories/${id}/restore` }, { csrf: true }),
  )
}
