import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { APIError } from '../../lib/api/error'
import { OAuthConsentPage } from './OAuthConsentPage'
import type { ConsentDetails } from './consentApi'
import { releaseConsentRequest } from './consentRequest'

const fetchConsent = vi.fn()
const approveConsent = vi.fn()
const denyConsent = vi.fn()

vi.mock('./consentApi', async importOriginal => ({
  ...(await importOriginal<typeof import('./consentApi')>()),
  fetchConsent: (...args: unknown[]) => fetchConsent(...args),
  approveConsent: (...args: unknown[]) => approveConsent(...args),
  denyConsent: (...args: unknown[]) => denyConsent(...args),
}))
vi.mock('../../hooks/useIsReadOnly', () => ({
  useIsReadOnly: () => false,
}))

const details = (overrides: Partial<ConsentDetails> = {}): ConsentDetails => ({
  client_name: 'Claude',
  scopes: ['snapper.read', 'offline_access'],
  resource: 'https://snapper.ch/api/mcp',
  operators: [{ public_id: 'op-1', name: 'Main desk' }],
  read_only: true,
  expires_in: 600,
  ...overrides,
})

const apiError = (status: number, code?: string): APIError =>
  new APIError('failed', status, 'Status', code === undefined ? undefined : { error_code: code })

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const renderPage = (fragment = '#request=opaque-1') => {
  const navigate = vi.fn()

  globalThis.history.replaceState(null, '', `/oauth/authorize${fragment}`)
  const view = render(<OAuthConsentPage navigate={navigate} />)

  return { navigate, ...view }
}

const approveButton = (): HTMLElement => screen.getByRole('button', { name: 'Allow access' })

describe('OAuthConsentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    releaseConsentRequest()
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.history.replaceState(null, '', '/')
  })

  it('rejects a missing request without contacting the backend', () => {
    renderPage('')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This authorization request is no longer valid'
    )
    expect(fetchConsent).not.toHaveBeenCalled()
  })

  it('keeps the captured request across a remount and forgets it after the decision', async () => {
    const user = userEvent.setup()

    fetchConsent.mockResolvedValue(details())
    denyConsent.mockResolvedValue('https://client.example/cb?error=access_denied')
    const first = renderPage()

    await screen.findByRole('button', { name: 'Deny' })
    expect(globalThis.location.hash).toBe('')
    first.unmount()

    const second = renderPage('')

    await user.click(await screen.findByRole('button', { name: 'Deny' }))
    expect(fetchConsent).toHaveBeenNthCalledWith(2, 'opaque-1')
    expect(second.navigate).toHaveBeenCalledWith('https://client.example/cb?error=access_denied')
    second.unmount()

    renderPage('')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This authorization request is no longer valid'
    )
    expect(fetchConsent).toHaveBeenCalledTimes(2)
  })

  it('starts over when a new authorization fragment arrives', async () => {
    fetchConsent.mockImplementation(async (request: string) =>
      details({ client_name: request === 'opaque-2' ? 'ChatGPT' : 'Claude' })
    )
    renderPage()

    await screen.findByText('Claude is asking to connect to your Snapper account.')

    act(() => {
      globalThis.history.replaceState(null, '', '/oauth/authorize#request=opaque-2')
      globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(
      await screen.findByText('ChatGPT is asking to connect to your Snapper account.')
    ).toBeInTheDocument()
    expect(fetchConsent).toHaveBeenLastCalledWith('opaque-2')
  })

  it('shows the request, the read-only guarantee and approves for the only operator', async () => {
    const user = userEvent.setup()

    fetchConsent.mockResolvedValue(details())
    approveConsent.mockResolvedValue('https://client.example/cb?code=c&state=s')
    const { navigate } = renderPage()

    expect(screen.getByText('Loading the authorization request…')).toBeInTheDocument()
    expect(
      await screen.findByText('Claude is asking to connect to your Snapper account.')
    ).toBeInTheDocument()
    expect(fetchConsent).toHaveBeenCalledWith('opaque-1')
    expect(screen.getByTestId('oauth-consent-read-only')).toHaveTextContent(
      'Read-only access limited to your existing permissions.'
    )
    expect(screen.getAllByTestId('oauth-consent-scope').map(item => item.textContent)).toEqual([
      'Read market data, orders, positions and signals, only where your own permissions allow it.',
      'Stay connected without asking you to sign in again.',
    ])
    expect(screen.getByText('https://snapper.ch/api/mcp')).toBeInTheDocument()
    expect(screen.getByText('Main desk')).toBeInTheDocument()

    await user.click(approveButton())

    expect(approveConsent).toHaveBeenCalledWith({
      request: 'opaque-1',
      operatorPublicId: 'op-1',
      replaceExistingGrant: false,
    })
    expect(navigate).toHaveBeenCalledWith('https://client.example/cb?code=c&state=s')
    expect(screen.getByText('Returning you to the connector…')).toBeInTheDocument()
  })

  it('requires an operator choice when several operators are available', async () => {
    const user = userEvent.setup()

    fetchConsent.mockResolvedValue(
      details({
        operators: [
          { public_id: 'op-1', name: 'Main desk' },
          { public_id: 'op-2', name: 'Research' },
        ],
      })
    )
    denyConsent.mockResolvedValue('https://client.example/cb?error=access_denied')
    const { navigate } = renderPage()
    const picker = await screen.findByRole('combobox', { name: 'Operator' })

    const denyButton = screen.getByRole('button', { name: 'Deny' })

    expect(approveButton()).toBeDisabled()
    expect(denyButton).toBeDisabled()
    await user.selectOptions(picker, 'op-2')
    expect(approveButton()).toBeEnabled()
    expect(denyButton).toBeEnabled()
    await user.selectOptions(picker, '')
    expect(approveButton()).toBeDisabled()
    expect(denyButton).toBeDisabled()
    await user.selectOptions(picker, 'op-1')
    await user.click(screen.getByRole('button', { name: 'Deny' }))

    expect(denyConsent).toHaveBeenCalledWith('opaque-1', 'op-1')
    expect(navigate).toHaveBeenCalledWith('https://client.example/cb?error=access_denied')
  })

  it('sends the only operator explicitly when denying', async () => {
    const user = userEvent.setup()

    fetchConsent.mockResolvedValue(details({ scopes: ['snapper.trade'] }))
    denyConsent.mockResolvedValue('https://client.example/cb?error=access_denied')
    renderPage()

    const denyButton = await screen.findByRole('button', { name: 'Deny' })

    expect(approveButton()).toBeDisabled()
    await user.click(denyButton)
    expect(denyConsent).toHaveBeenCalledWith('opaque-1', 'op-1')
  })

  it('sends no operator when the request has none', async () => {
    const user = userEvent.setup()

    fetchConsent.mockResolvedValue(details({ operators: [], scopes: ['snapper.read'] }))
    approveConsent.mockResolvedValue('https://client.example/cb')
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Allow access' }))

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(approveConsent).toHaveBeenCalledWith({
      request: 'opaque-1',
      operatorPublicId: null,
      replaceExistingGrant: false,
    })
  })

  it('fails closed for unrecognized scopes and still allows denial', async () => {
    fetchConsent.mockResolvedValue(details({ scopes: ['snapper.read', 'snapper.trade'] }))
    renderPage()

    expect(await screen.findByText('Unrecognized permission: snapper.trade')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('cannot grant')
    expect(approveButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled()
  })

  it('fails closed when the backend does not assert read-only access', async () => {
    fetchConsent.mockResolvedValue(details({ read_only: false }))
    renderPage()

    await screen.findByText('Claude is asking to connect to your Snapper account.')

    expect(approveButton()).toBeDisabled()
  })

  it.each([
    [apiError(400, 'consent_request_invalid'), 'This authorization request is no longer valid'],
    [apiError(403, 'consent_access_denied'), 'You cannot authorize this connector'],
    [apiError(503), 'AI integration is disabled'],
  ])('shows a terminal state when loading fails (%s)', async (error, title) => {
    fetchConsent.mockRejectedValue(error)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(title)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it.each([[new Error('network')], [apiError(500)], [apiError(409, 'grant_replacement_required')]])(
    'keeps the capability and offers a retry after a transient load failure (%s)',
    async error => {
      const user = userEvent.setup()

      fetchConsent
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(details())
      const first = renderPage()

      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
      first.unmount()

      renderPage('')
      await user.click(await screen.findByRole('button', { name: 'Retry' }))

      expect(
        await screen.findByText('Claude is asking to connect to your Snapper account.')
      ).toBeInTheDocument()
      expect(fetchConsent).toHaveBeenNthCalledWith(3, 'opaque-1')
    }
  )

  it('lets the server decide when the lifetime ends during a decision', async () => {
    vi.useFakeTimers()
    const approved = deferred<string>()

    fetchConsent.mockResolvedValue(details({ expires_in: 1 }))
    approveConsent.mockReturnValue(approved.promise)
    const { navigate } = renderPage()

    await act(async () => {
      await Promise.resolve()
    })
    await act(async () => {
      approveButton().click()
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(1_000)
    })

    expect(screen.queryByText('This authorization request has expired')).not.toBeInTheDocument()

    await act(async () => {
      approved.resolve('https://client.example/cb')
      await Promise.resolve()
    })

    expect(navigate).toHaveBeenCalledWith('https://client.example/cb')
  })

  it.each([[new Error('network')], [apiError(409, 'grant_replacement_required')]])(
    'expires after a non-final decision outcome once the lifetime has passed (%s)',
    async error => {
      vi.useFakeTimers()
      const approved = deferred<string>()

      fetchConsent.mockResolvedValue(details({ expires_in: 1 }))
      approveConsent.mockReturnValue(approved.promise)
      renderPage()

      await act(async () => {
        await Promise.resolve()
      })
      await act(async () => {
        approveButton().click()
        await Promise.resolve()
      })
      await act(async () => {
        vi.advanceTimersByTime(1_000)
      })
      await act(async () => {
        approved.reject(error)
        await Promise.resolve()
      })

      expect(screen.getByRole('alert')).toHaveTextContent('This authorization request has expired')
      expect(screen.queryByText('Replace the existing connection?')).not.toBeInTheDocument()
    }
  )

  it('lets a final server refusal win over a lapsed lifetime', async () => {
    vi.useFakeTimers()
    const denied = deferred<string>()

    fetchConsent.mockResolvedValue(details({ expires_in: 1 }))
    denyConsent.mockReturnValue(denied.promise)
    renderPage()

    await act(async () => {
      await Promise.resolve()
    })
    await act(async () => {
      screen.getByRole('button', { name: 'Deny' }).click()
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(1_000)
    })
    await act(async () => {
      denied.reject(apiError(403, 'consent_access_denied'))
      await Promise.resolve()
    })

    expect(screen.getByRole('alert')).toHaveTextContent('You cannot authorize this connector')
  })

  it('asks for explicit confirmation before replacing an existing grant', async () => {
    const user = userEvent.setup()

    fetchConsent.mockResolvedValue(details())
    approveConsent
      .mockRejectedValueOnce(apiError(409, 'grant_replacement_required'))
      .mockRejectedValueOnce(apiError(409, 'grant_replacement_required'))
      .mockResolvedValueOnce('https://client.example/cb')
    const { navigate } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Allow access' }))
    expect(await screen.findByText('Replace the existing connection?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep existing' }))
    await waitFor(() =>
      expect(screen.queryByText('Replace the existing connection?')).not.toBeInTheDocument()
    )
    expect(approveConsent).toHaveBeenCalledTimes(1)

    await user.click(approveButton())
    await user.click(await screen.findByRole('button', { name: 'Replace connection' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://client.example/cb'))
    expect(approveConsent).toHaveBeenLastCalledWith({
      request: 'opaque-1',
      operatorPublicId: 'op-1',
      replaceExistingGrant: true,
    })
  })

  it('keeps the form after an unexpected submit failure', async () => {
    const user = userEvent.setup()

    fetchConsent.mockResolvedValue(details())
    approveConsent.mockRejectedValue(new Error('network'))
    const { navigate } = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Allow access' }))

    expect(
      await screen.findByText('The decision could not be sent. Try again.')
    ).toBeInTheDocument()
    expect(approveButton()).toBeEnabled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('ends the flow when a decision is refused', async () => {
    const user = userEvent.setup()

    fetchConsent.mockResolvedValue(details())
    denyConsent.mockRejectedValue(apiError(400, 'consent_request_invalid'))
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Deny' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This authorization request is no longer valid'
    )
  })

  it('expires the request when its lifetime ends', async () => {
    vi.useFakeTimers()
    fetchConsent.mockResolvedValue(details({ expires_in: 2 }))
    renderPage()

    await act(async () => {
      await Promise.resolve()
    })
    expect(
      screen.getByText('Claude is asking to connect to your Snapper account.')
    ).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })

    expect(screen.getByRole('alert')).toHaveTextContent('This authorization request has expired')
  })

  it('ignores a load that settles after the page unmounts', async () => {
    const success = deferred<ConsentDetails>()
    const failure = deferred<ConsentDetails>()

    fetchConsent.mockReturnValueOnce(success.promise).mockReturnValueOnce(failure.promise)
    const first = renderPage()
    const second = renderPage('#request=opaque-2')

    first.unmount()
    second.unmount()

    await act(async () => {
      success.resolve(details())
      failure.reject(new Error('late'))
      await Promise.resolve()
    })

    expect(fetchConsent).toHaveBeenCalledTimes(2)
  })

  it('ignores a decision that settles after the page unmounts', async () => {
    const user = userEvent.setup()
    const approved = deferred<string>()
    const denied = deferred<string>()

    fetchConsent.mockResolvedValue(details())
    approveConsent.mockReturnValue(approved.promise)
    denyConsent.mockReturnValue(denied.promise)
    const first = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Allow access' }))
    first.unmount()

    const second = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Deny' }))
    second.unmount()

    await act(async () => {
      approved.resolve('https://client.example/cb')
      denied.reject(new Error('late'))
      await Promise.resolve()
    })

    expect(first.navigate).not.toHaveBeenCalled()
    expect(second.navigate).not.toHaveBeenCalled()
  })
})
