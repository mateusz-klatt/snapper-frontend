import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError } from '../../lib/api/error'
import {
  approveConsent,
  classifyConsentError,
  denyConsent,
  fetchConsent,
  safeRedirectTarget,
  scopesApprovable,
} from './consentApi'

const requestJSON = vi.fn()
const postJSON = vi.fn()

vi.mock('../../lib/apiClient', async () => {
  const errorModule = await import('../../lib/api/error')

  return {
    APIError: errorModule.APIError,
    apiClient: {
      requestJSON: (...args: unknown[]) => requestJSON(...args),
      postJSON: (...args: unknown[]) => postJSON(...args),
    },
  }
})

const apiError = (status: number, details?: unknown): APIError =>
  new APIError('failed', status, 'Status', details)

describe('consentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('approves only read access that includes snapper.read', () => {
    expect(scopesApprovable(['snapper.read'])).toBe(true)
    expect(scopesApprovable(['snapper.read', 'offline_access'])).toBe(true)
    expect(scopesApprovable([])).toBe(false)
    expect(scopesApprovable(['offline_access'])).toBe(false)
    expect(scopesApprovable(['snapper.read', 'snapper.trade'])).toBe(false)
  })

  it('accepts only absolute http(s) redirect targets', () => {
    expect(safeRedirectTarget('https://client.example/cb?code=x&state=y')).toBe(
      'https://client.example/cb?code=x&state=y'
    )
    expect(safeRedirectTarget('http://127.0.0.1:8080/cb')).toBe('http://127.0.0.1:8080/cb')
    expect(safeRedirectTarget('javascript:alert(1)')).toBeNull()
    expect(safeRedirectTarget('/relative')).toBeNull()
    expect(safeRedirectTarget(42)).toBeNull()
  })

  it('classifies structured consent errors and falls back safely', () => {
    expect(classifyConsentError(apiError(400, { error_code: 'consent_request_invalid' }))).toBe(
      'invalid_request'
    )
    expect(classifyConsentError(apiError(400, { error_code: 'consent_scope_invalid' }))).toBe(
      'invalid_request'
    )
    expect(classifyConsentError(apiError(403, { error_code: 'consent_access_denied' }))).toBe(
      'access_denied'
    )
    expect(classifyConsentError(apiError(409, { error_code: 'grant_replacement_required' }))).toBe(
      'replacement_required'
    )
    expect(classifyConsentError(apiError(503))).toBe('disabled')
    expect(classifyConsentError(apiError(403, 'Forbidden'))).toBe('access_denied')
    expect(classifyConsentError(apiError(400, { error_code: 'something_else' }))).toBe('unknown')
    expect(classifyConsentError(apiError(500, { error_code: 7 }))).toBe('unknown')
    expect(classifyConsentError(apiError(500, null))).toBe('unknown')
    expect(classifyConsentError(new Error('network'))).toBe('unknown')
  })

  it('loads the consent payload with the capability only in a request header', async () => {
    const details = {
      client_name: 'Claude',
      scopes: ['snapper.read'],
      resource: 'https://snapper.ch/api/mcp',
      operators: [],
      read_only: true,
      expires_in: 600,
    }

    requestJSON.mockResolvedValue({ type: 'mcp_oauth_consent_request', payload: details })

    await expect(fetchConsent('opaque-1')).resolves.toEqual(details)
    expect(requestJSON).toHaveBeenCalledWith('/api/mcp-oauth/consent', {
      method: 'GET',
      headers: { 'X-MCP-OAuth-Request': 'opaque-1' },
    })
  })

  it('posts approve and deny commands and returns the validated redirect', async () => {
    postJSON.mockResolvedValue({ payload: { redirect_to: 'https://client.example/cb' } })

    await expect(
      approveConsent({ request: 'r', operatorPublicId: 'op-1', replaceExistingGrant: true })
    ).resolves.toBe('https://client.example/cb')
    expect(postJSON).toHaveBeenCalledWith('/api/mcp-oauth/consent/approve', {
      request: 'r',
      operator_public_id: 'op-1',
      replace_existing_grant: true,
    })

    await expect(denyConsent('r', null)).resolves.toBe('https://client.example/cb')
    expect(postJSON).toHaveBeenLastCalledWith('/api/mcp-oauth/consent/deny', {
      request: 'r',
      operator_public_id: null,
    })
  })

  it('refuses to return an unsafe redirect from the backend', async () => {
    postJSON.mockResolvedValue({ payload: { redirect_to: 'javascript:alert(1)' } })

    await expect(denyConsent('r', null)).rejects.toThrow('consent_redirect_invalid')
  })
})
