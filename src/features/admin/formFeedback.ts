import { toast } from 'react-hot-toast'

export const showConflictAwareErrorToast = (
  err: Error,
  conflictMessage: string,
  fallbackMessage: string
): void => {
  const message = err.message
  const normalized = message.toLowerCase()

  if (
    message.includes('409') ||
    normalized.includes('conflict') ||
    normalized.includes('already')
  ) {
    toast.error(conflictMessage)

    return
  }

  toast.error(message || fallbackMessage)
}
