import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppWithAuth from '../../AppWithAuth'
import { useAuthStore } from '../../stores/auth'
import { releaseConsentRequest } from './consentRequest'

vi.mock('../../App', () => ({
  default: () => <div data-testid='app'>App</div>,
}))

const SENTINEL = 'sentinel-capability-7f3a'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const loginResponse = (): Response =>
  json({
    type: 'auth_login_response',
    payload: {
      user: {
        public_id: 'u-1',
        username: 'owner',
        role: 'admin',
        effective_permissions: ['manage:ai_integration'],
      },
      csrf_token: 'csrf-1',
    },
  })

const consentResponse = (): Response =>
  json({
    type: 'mcp_oauth_consent_request',
    payload: {
      client_name: 'Claude',
      scopes: ['snapper.read'],
      resource: 'https://snapper.ch/api/mcp',
      operators: [],
      read_only: true,
      expires_in: 600,
    },
  })

describe('OAuth consent entry flow', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, csrfToken: null, error: null })
    releaseConsentRequest()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.history.replaceState(null, '', '/')
  })

  it('keeps the capability out of every URL from unauthenticated entry through login', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        const url = String(input)

        if (url === '/api/auth/login') return loginResponse()
        if (url === '/api/mcp-oauth/consent') return consentResponse()

        return json({ detail: 'unexpected' }, 404)
      }
    )

    vi.stubGlobal('fetch', fetchMock)
    globalThis.history.replaceState(null, '', `/oauth/authorize#request=${SENTINEL}`)

    render(<AppWithAuth />)

    expect(globalThis.location.href).not.toContain(SENTINEL)
    expect(globalThis.location.pathname).toBe('/oauth/authorize')
    await user.type(screen.getByLabelText('Username'), 'owner')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(
      await screen.findByText('Claude is asking to connect to your Snapper account.')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('app')).not.toBeInTheDocument()

    const consentCall = fetchMock.mock.calls.find(([url]) => url === '/api/mcp-oauth/consent')
    const headers = new Headers(consentCall?.[1]?.headers)

    expect(headers.get('X-MCP-OAuth-Request')).toBe(SENTINEL)
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes(SENTINEL))).toBe(true)
    expect(globalThis.location.href).not.toContain(SENTINEL)
  })
})
