import { ElMessage } from 'element-plus'

export function showActionSuccess(message) {
  return ElMessage({
    message,
    type: 'success',
    duration: 3000,
    showClose: true,
    grouping: true,
  })
}
