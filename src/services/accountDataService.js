import { apiRequest } from './httpClient'

export async function archiveAccountData() {
  const response = await apiRequest(
    { method: 'post', url: '/api/v1/account-data/archive', data: {} },
    { csrf: true },
  )
  return response.data.data
}

export async function deleteAccountData(currentPassword) {
  await apiRequest(
    { method: 'delete', url: '/api/v1/account-data', data: { current_password: currentPassword } },
    { csrf: true },
  )
}

export async function listAccountDataArchives() {
  const response = await apiRequest({ method: 'get', url: '/api/v1/account-data/archives' })
  return response.data.data
}

export async function restoreAccountDataArchive(archiveId) {
  const response = await apiRequest(
    { method: 'post', url: `/api/v1/account-data/archives/${archiveId}/restore`, data: {} },
    { csrf: true },
  )
  return response.data.data
}

export async function listAccountDataArchiveRecords(archiveId, type, page = 1) {
  const response = await apiRequest({
    method: 'get',
    url: `/api/v1/account-data/archives/${archiveId}/records`,
    params: { type, page },
  })
  return response.data
}
