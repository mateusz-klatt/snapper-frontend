import { toast } from 'react-hot-toast'

export const showSuccessToastAndClose = (message: string, close: () => void): void => {
  toast.success(message)
  close()
}

export const showErrorToast = (err: Error, fallbackMessage: string): void => {
  toast.error(err.message || fallbackMessage)
}

const showConflictAwareErrorToast = (
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

export const createConflictMutationFeedback = (
  successMessage: string,
  close: () => void,
  conflictMessage: string,
  fallbackMessage: string
) => ({
  onSuccess: () => showSuccessToastAndClose(successMessage, close),
  onError: (err: Error) => showConflictAwareErrorToast(err, conflictMessage, fallbackMessage),
})
