import { apiClient, APIError } from '../../lib/apiClient'

export const OAUTH_CONSENT_PATH = '/oauth/authorize'

const CONSENT_URL = '/api/mcp-oauth/consent'

const ALLOWED_SCOPES = ['snapper.read', 'offline_access'] as const

export type AllowedScope = (typeof ALLOWED_SCOPES)[number]

export interface ConsentOperator {
  public_id: string
  name: string
}

export interface ConsentDetails {
  client_name: string
  scopes: string[]
  resource: string
  operators: ConsentOperator[]
  read_only: boolean
  expires_in: number
}

interface PayloadEnvelope<T> {
  payload: T
}

interface ConsentRedirect {
  redirect_to: string
}

export type ConsentErrorKind =
  'invalid_request' | 'access_denied' | 'replacement_required' | 'disabled' | 'unknown'

const ERROR_CODE_KINDS: Readonly<Record<string, ConsentErrorKind>> = {
  consent_request_invalid: 'invalid_request',
  consent_scope_invalid: 'invalid_request',
  consent_access_denied: 'access_denied',
  grant_replacement_required: 'replacement_required',
  feature_disabled: 'disabled',
}

const errorCodeOf = (details: unknown): string | null => {
  if (typeof details !== 'object' || details === null) return null
  const code = (details as { error_code?: unknown }).error_code

  return typeof code === 'string' ? code : null
}

export const classifyConsentError = (error: unknown): ConsentErrorKind => {
  if (!(error instanceof APIError)) return 'unknown'
  const code = errorCodeOf(error.details)

  if (code !== null && Object.hasOwn(ERROR_CODE_KINDS, code)) {
    return ERROR_CODE_KINDS[code] as ConsentErrorKind
  }

  if (error.status === 503) return 'disabled'

  if (error.status === 403) return 'access_denied'

  return 'unknown'
}

export const isAllowedScope = (scope: string): scope is AllowedScope =>
  (ALLOWED_SCOPES as readonly string[]).includes(scope)

export const scopesApprovable = (scopes: readonly string[]): boolean =>
  scopes.includes('snapper.read') && scopes.every(isAllowedScope)

export const safeRedirectTarget = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  try {
    const url = new URL(value)

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

const redirectOf = (response: PayloadEnvelope<ConsentRedirect>): string => {
  const target = safeRedirectTarget(response.payload.redirect_to)

  if (target === null) throw new Error('consent_redirect_invalid')

  return target
}

const CONSENT_REQUEST_HEADER = 'X-MCP-OAuth-Request'

export const fetchConsent = async (request: string): Promise<ConsentDetails> => {
  const response = await apiClient.requestJSON<PayloadEnvelope<ConsentDetails>>(CONSENT_URL, {
    method: 'GET',
    headers: { [CONSENT_REQUEST_HEADER]: request },
  })

  return response.payload
}

export interface ApproveInput {
  request: string
  operatorPublicId: string | null
  replaceExistingGrant: boolean
}

export const approveConsent = async (input: ApproveInput): Promise<string> =>
  redirectOf(
    await apiClient.postJSON<PayloadEnvelope<ConsentRedirect>>(`${CONSENT_URL}/approve`, {
      oauth_request: input.request,
      operator_public_id: input.operatorPublicId,
      replace_existing_grant: input.replaceExistingGrant,
    })
  )

export const denyConsent = async (
  request: string,
  operatorPublicId: string | null
): Promise<string> =>
  redirectOf(
    await apiClient.postJSON<PayloadEnvelope<ConsentRedirect>>(`${CONSENT_URL}/deny`, {
      oauth_request: request,
      operator_public_id: operatorPublicId,
    })
  )
