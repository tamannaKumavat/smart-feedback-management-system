import { toast } from 'react-toastify'

export function showSuccess(message) {
  toast.success(message)
}

export function showError(error, fallback = 'Something went wrong.') {
  if (typeof error === 'string') {
    toast.error(error)
    return
  }
  if (error?.message) {
    toast.error(error.message)
    return
  }
  toast.error(fallback)
}
