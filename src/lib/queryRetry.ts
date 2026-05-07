import { APIError } from './api/error'

export const calculateRetryDelay = (attemptIndex: number): number =>
  Math.min(1000 * 2 ** attemptIndex, 30000)

/**
 * Skip retries on 4xx client errors. Retrying a 400/401/403/404 will
 * never succeed with the same payload — the call is unambiguously
 * rejected by the server. Default react-query 3× retries on these
 * statuses produce noisy duplicate requests that pollute logs and
 * waste server CPU without changing the outcome. 5xx and network
 * failures still retry up to 3× (transient causes).
 */
export const shouldRetryQuery = (failureCount: number, error: Error): boolean => {
  if (error instanceof APIError && error.status >= 400 && error.status < 500) {
    return false
  }

  return failureCount < 3
}
