/**
 * HTTP error thrown by getJSON/postJSON when the response is not OK.
 *
 * Preserves the response status + statusText so callers (notably
 * ComparePage) can branch on `error instanceof APIError && error.status === 404`
 * for wallet-scope misses, while existing `.message`-based assertions
 * keep working because APIError extends Error and reuses the same
 * message format.
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class RefreshBodyReadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'RefreshBodyReadError'
  }
}

export type RefreshFailureKind =
  'terminal_auth' | 'transient_transport' | 'transient_http' | 'other'

function isTransientRefreshHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600)
}

function isTerminalRefreshHttpStatus(status: number): boolean {
  return status === 401 || status === 403
}

export function isTransientRefreshTransportError(
  error: unknown
): error is TypeError | RefreshBodyReadError | DOMException {
  return (
    error instanceof TypeError ||
    error instanceof RefreshBodyReadError ||
    (error instanceof DOMException &&
      (error.name === 'AbortError' || error.name === 'TimeoutError'))
  )
}

export function classifyRefreshFailure(error: unknown): RefreshFailureKind {
  if (isTransientRefreshTransportError(error)) {
    return 'transient_transport'
  }

  if (error instanceof APIError) {
    if (isTerminalRefreshHttpStatus(error.status)) {
      return 'terminal_auth'
    }

    if (isTransientRefreshHttpStatus(error.status)) {
      return 'transient_http'
    }
  }

  return 'other'
}

export function isTransientRefreshError(error: unknown): boolean {
  const kind = classifyRefreshFailure(error)

  return kind === 'transient_transport' || kind === 'transient_http'
}

export function isTerminalRefreshAuthError(error: unknown): error is APIError {
  return classifyRefreshFailure(error) === 'terminal_auth'
}
