import { v7 as uuid7 } from 'uuid'
import { getCookie } from './utils'
import { storeWsTicket } from './wsTicketCache'
import { getTracker } from './sequenceTracker'
import { APIError } from './api/error'

export { APIError } from './api/error'

interface RequestOptions {
  skipCSRF?: boolean
  skipRetry?: boolean
  method?: string
  headers?: Record<string, string> | Headers
  body?: string | FormData | URLSearchParams | null | undefined
}

interface ErrorPayload {
  message: string
  details?: unknown
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function fallbackErrorMessage(response: Pick<Response, 'status' | 'statusText'>): string {
  return `HTTP ${response.status}: ${response.statusText}`
}

function stringifyErrorValue(value: unknown, fallbackMessage: string): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }

  if (value === null || value === undefined) {
    return fallbackMessage
  }

  if (typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value)

      if (serialized !== undefined) {
        return serialized
      }
    } catch {
      return fallbackMessage
    }
  }

  return fallbackMessage
}

function extractArrayDetail(detail: unknown[], fallbackMessage: string): ErrorPayload {
  const first = detail[0]

  if (isRecord(first) && Object.hasOwn(first, 'msg')) {
    return {
      message: stringifyErrorValue(first.msg, fallbackMessage),
      details: detail,
    }
  }

  return { message: fallbackMessage, details: detail }
}

function extractObjectDetail(
  detail: Record<string, unknown>,
  fallbackMessage: string
): ErrorPayload {
  const reason = detail.reason

  if (typeof reason === 'string' && reason.length > 0) {
    return { message: reason, details: detail }
  }

  const errorCode = detail.error_code

  if (typeof errorCode === 'string' && errorCode.length > 0) {
    return { message: errorCode, details: detail }
  }

  return { message: fallbackMessage, details: detail }
}

function extractDetailPayload(detail: unknown, fallbackMessage: string): ErrorPayload {
  if (detail === null) {
    return { message: fallbackMessage }
  }

  if (Array.isArray(detail)) {
    return extractArrayDetail(detail, fallbackMessage)
  }

  if (isRecord(detail)) {
    return extractObjectDetail(detail, fallbackMessage)
  }

  return { message: stringifyErrorValue(detail, fallbackMessage) }
}

function extractErrorPayload(data: unknown, fallbackMessage: string): ErrorPayload {
  if (!isRecord(data)) {
    return { message: fallbackMessage }
  }

  if (Object.hasOwn(data, 'detail')) {
    return extractDetailPayload(data.detail, fallbackMessage)
  }

  if (Object.hasOwn(data, 'message')) {
    return { message: stringifyErrorValue(data.message, fallbackMessage) }
  }

  return { message: fallbackMessage }
}

class APIClient {
  private static instance: APIClient
  private isLoggingOut = false
  private timeTravelAsOf: string | null = null
  private operatorPublicId: string | null = null
  private walletPublicId: string | null = null
  private constructor() {}
  public setTimeTravelAsOf(asOf: string | null): void {
    this.timeTravelAsOf = asOf
  }
  public getTimeTravelAsOf(): string | null {
    return this.timeTravelAsOf
  }
  public setOperatorScope(id: string | null): void {
    this.operatorPublicId = id
  }
  public setWalletScope(id: string | null): void {
    this.walletPublicId = id
  }
  public getOperatorScope(): string | null {
    return this.operatorPublicId
  }
  public getWalletScope(): string | null {
    return this.walletPublicId
  }
  public static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient()
    }

    return APIClient.instance
  }
  private getCSRFToken(): string {
    return getCookie('csrf_token')
  }
  private applyCSRFHeader(headers: Headers, skipCSRF: boolean, method: string | undefined): void {
    if (skipCSRF) {
      return
    }

    if (!MUTATING_METHODS.has(method?.toUpperCase() || 'GET')) {
      return
    }

    const csrfToken = this.getCSRFToken()

    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }
  private async refreshAndRetry(url: string, options: RequestOptions): Promise<Response> {
    try {
      const csrfToken = this.getCSRFToken()
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json',
        },
      })

      if (refreshResponse.ok) {
        await cacheWsTicketFromResponse(refreshResponse)

        return this.request(url, { ...options, skipRetry: true })
      }

      this.handleAuthenticationFailure()
      throw new Error('Authentication required')
    } catch {
      this.handleAuthenticationFailure()
      throw new Error('Authentication required')
    }
  }
  private async handleCSRFError(
    url: string,
    options: RequestOptions,
    response: Response
  ): Promise<Response> {
    const errorData = await response
      .clone()
      .json()
      .catch(() => ({}))

    if (typeof errorData.detail === 'string' && errorData.detail.includes('CSRF')) {
      return this.request(url, { ...options, skipRetry: true, skipCSRF: true })
    }

    throw new Error('Access denied')
  }
  public async request(url: string, options: RequestOptions = {}): Promise<Response> {
    const method = (options.method ?? 'GET').toUpperCase()

    if (
      this.timeTravelAsOf &&
      MUTATING_METHODS.has(method) &&
      !APIClient.AUTH_PATHS.has(url.split('?')[0] as string)
    ) {
      throw new Error('Write operations are disabled in time-travel mode')
    }

    const { skipCSRF = false, skipRetry = false, body, ...fetchOptions } = options
    const headers = new Headers(fetchOptions.headers)

    this.applyCSRFHeader(headers, skipCSRF, options.method)

    if (body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(url, {
      ...fetchOptions,
      ...(body !== undefined ? { body } : {}),
      headers,
      credentials: 'include',
    })

    if (response.status === 401 && !skipRetry) {
      return this.refreshAndRetry(url, options)
    }

    if (response.status === 403 && !skipCSRF && !skipRetry) {
      return this.handleCSRFError(url, options, response)
    }

    return response
  }
  private handleAuthenticationFailure(): void {
    if (this.isLoggingOut) {
      return
    }

    this.isLoggingOut = true
    this.clearCSRFToken()

    const authCallback = (globalThis as { authLogoutCallback?: () => void }).authLogoutCallback

    if (authCallback) {
      authCallback()
    }

    setTimeout(() => {
      this.isLoggingOut = false
    }, 1000)
  }
  public async get(url: string, options: RequestOptions = {}): Promise<Response> {
    if (this.timeTravelAsOf) {
      const separator = url.includes('?') ? '&' : '?'

      url = `${url}${separator}as_of=${encodeURIComponent(this.timeTravelAsOf)}`
    }

    if (this.operatorPublicId) {
      const separator = url.includes('?') ? '&' : '?'

      url = `${url}${separator}operator_public_id=${encodeURIComponent(this.operatorPublicId)}`
    }

    if (this.walletPublicId) {
      const separator = url.includes('?') ? '&' : '?'

      url = `${url}${separator}wallet_public_id=${encodeURIComponent(this.walletPublicId)}`
    }

    return this.request(url, { ...options, method: 'GET' })
  }
  private static readonly AUTH_PATHS = new Set([
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
  ])
  public async post(url: string, body?: unknown, options: RequestOptions = {}): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(stampProvenance(body)) : undefined,
    })
  }
  private async raiseHttpError(response: Response): Promise<never> {
    const { message, details } = await this.extractError(response)

    throw new APIError(message, response.status, response.statusText, details)
  }
  private async extractError(response: Response): Promise<ErrorPayload> {
    const fallbackMessage = fallbackErrorMessage(response)

    try {
      const data: unknown = await response.json()

      return extractErrorPayload(data, fallbackMessage)
    } catch {
      return { message: fallbackMessage }
    }
  }
  public async getJSON<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.get(url, options)

    if (!response.ok) {
      await this.raiseHttpError(response)
    }

    return response.json()
  }
  public async postJSON<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const response = await this.post(url, body, options)

    if (!response.ok) {
      await this.raiseHttpError(response)
    }

    return response.json()
  }
  public async patchJSON<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(stampProvenance(body)) : undefined,
    })

    if (!response.ok) {
      await this.raiseHttpError(response)
    }

    return response.json()
  }
  /**
   * Bypass scope-injection for read paths that already encode their
   * own filters server-side (scope-grants, credentials, ai-reviews).
   *
   * Why: `get()` auto-appends `as_of` / `operator_public_id` /
   * `wallet_public_id` query params for the time-travel + multi-tenant
   * scope filter. A handful of endpoints intentionally take their
   * scope from the URL/body instead. This helper preserves that path
   * while still surfacing API errors as APIError.
   */
  public async requestJSON<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(url, options)

    if (!response.ok) {
      await this.raiseHttpError(response)
    }

    return response.json()
  }
  public clearCSRFToken(): void {
    this.setCsrfToken(null)
  }
  public setCsrfToken(token: string | null): void {
    if (typeof document === 'undefined') {
      return
    }

    const name = 'csrf_token'
    const secureFlag = globalThis.window?.location.protocol === 'https:' ? '; Secure' : ''

    if (!token) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`

      return
    }

    const encoded = encodeURIComponent(token)

    document.cookie = `${name}=${encoded}; Path=/; SameSite=Lax${secureFlag}`
  }
  public hasAuthCookies(): boolean {
    const cookies = document.cookie.split(';')

    for (const cookie of cookies) {
      const [name] = cookie.trim().split('=')

      if (name === 'refresh_token' || name === 'csrf_token' || name === 'access_token') {
        return true
      }
    }

    return false
  }
}

export const apiClient = APIClient.getInstance()

function stampProvenance(body: unknown): unknown {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return body

  const tracker = getTracker()

  return {
    public_id: uuid7(),
    session_id: tracker.sessionId,
    sequence_id: tracker.nextSequence('control'),
    timestamp: new Date().toISOString(),
    payload: body,
  }
}

async function cacheWsTicketFromResponse(response: Response): Promise<void> {
  try {
    const envelope = (await response.clone().json()) as {
      payload?: {
        ws_token?: string
        ws_token_exp?: string
      }
    }
    const data = envelope?.payload

    if (typeof data?.ws_token === 'string' && typeof data?.ws_token_exp === 'string') {
      const expSeconds = Math.floor(new Date(data.ws_token_exp).getTime() / 1000)

      storeWsTicket({ token: data.ws_token, exp: expSeconds })
    } else {
      storeWsTicket(null)
    }
  } catch {
    storeWsTicket(null)
  }
}
