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
