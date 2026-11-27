import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { apiClient } from './apiClient'
import { getWsToken, WsTicketNetworkError } from './websocket/auth'
import WebSocketClient from './websocket/client'
import { consumeWsTicket, storeWsTicket } from './wsTicketCache'
import { useAuthStore } from '../stores/auth'
import { useWebSocketConnection, useWebSocketStore } from '../stores/websocket'
import { makeUserProfile } from '../test/factories'
import { createAuthComplete, createAuthRequired } from '../test/wsMessageFactories'

const EXP = '2030-01-01T00:00:00.000Z'

function makeTicketPayload(token: string) {
  return {
    payload: {
      ws_token: token,
      ws_token_exp: EXP,
      csrf_token: 'csrf-next',
      user: makeUserProfile({ username: 'trader' }),
    },
  }
}

class BrowserLikeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static readonly instances: BrowserLikeWebSocket[] = []
  readyState = BrowserLikeWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((event: Event) => void) | null = null
  send = vi.fn()
  close = vi.fn((_code?: number) => {
    this.readyState = BrowserLikeWebSocket.CLOSING
  })
  constructor(_url: string) {
    BrowserLikeWebSocket.instances.push(this)
    setTimeout(() => {
      this.readyState = BrowserLikeWebSocket.OPEN
      this.onopen?.()
      this.receive(createAuthRequired())
    }, 10)
  }
  receive(message: object): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))
  }
}

describe('single-consumer ws_token ownership and real-store failure isolation', () => {
  const socketA = {} as WebSocket
  const socketB = {} as WebSocket

  beforeEach(() => {
    BrowserLikeWebSocket.instances.length = 0
    storeWsTicket(null)
    apiClient.clearCSRFToken()
    useWebSocketStore.setState({
      wsClient: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      terminalFailure: null,
    })
    useAuthStore.setState({
      user: makeUserProfile({ username: 'trader' }),
      isAuthenticated: true,
      csrfToken: null,
      error: null,
    })
  })

  afterEach(() => {
    useWebSocketStore.getState().disconnect()
    storeWsTicket(null)
    apiClient.clearCSRFToken()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each(['ws-starts', 'rest-starts'] as const)(
    'delivers ws_token only to WS when getWsToken and authStore.refreshToken overlap (%s)',
    async order => {
      let releaseFetch!: () => void
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>(resolve => {
              releaseFetch = () =>
                resolve(new Response(JSON.stringify(makeTicketPayload('T1')), { status: 200 }))
            })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(makeTicketPayload('T2')), { status: 200 })
        )

      vi.stubGlobal('fetch', fetchMock)

      let wsPromise: ReturnType<typeof getWsToken>
      let restPromise: ReturnType<ReturnType<typeof useAuthStore.getState>['refreshToken']>

      if (order === 'ws-starts') {
        wsPromise = getWsToken(socketA, () => true)
        restPromise = useAuthStore.getState().refreshToken()
      } else {
        restPromise = useAuthStore.getState().refreshToken()
        wsPromise = getWsToken(socketA, () => true)
      }

      expect(fetchMock).toHaveBeenCalledTimes(1)
      releaseFetch()

      const [ticket] = await Promise.all([wsPromise, restPromise])

      expect(ticket).toEqual({ token: 'T1', exp: Math.floor(Date.parse(EXP) / 1000) })
      expect(consumeWsTicket(0)).toBeNull()

      const nextTicket = await getWsToken(socketB, () => true)

      expect(nextTicket).toEqual({ token: 'T2', exp: Math.floor(Date.parse(EXP) / 1000) })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    }
  )

  it.each(['ws-first', 'rest-first'] as const)(
    'delivers ws_token only to WS when apiClient.refreshAndRetry overlaps (%s)',
    async order => {
      let releaseRefresh!: () => void
      const refreshPromise = new Promise<Response>(resolve => {
        releaseRefresh = () =>
          resolve(new Response(JSON.stringify(makeTicketPayload('T1')), { status: 200 }))
      })
      const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const url = String(input)

        if (url === '/api/auth/refresh') {
          return refreshPromise
        }

        if (fetchMock.mock.calls.filter(([u]) => String(u) === '/api/orders').length === 1) {
          return new Response(null, { status: 401 })
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      })

      vi.stubGlobal('fetch', fetchMock)

      let wsPromise: ReturnType<typeof getWsToken>
      let restPromise: Promise<Response>

      if (order === 'ws-first') {
        wsPromise = getWsToken(socketA, () => true)
        restPromise = apiClient.request('/api/orders', { method: 'GET' })
        await Promise.resolve()
      } else {
        restPromise = apiClient.request('/api/orders', { method: 'GET' })
        await Promise.resolve()
        wsPromise = getWsToken(socketA, () => true)
      }

      releaseRefresh()

      const [ticket, restResponse] = await Promise.all([wsPromise, restPromise])

      expect(ticket).toEqual({ token: 'T1', exp: Math.floor(Date.parse(EXP) / 1000) })
      expect(restResponse.ok).toBe(true)
      expect(consumeWsTicket(0)).toBeNull()
      expect(fetchMock.mock.calls.filter(([u]) => String(u) === '/api/auth/refresh')).toHaveLength(
        1
      )
    }
  )

  it('prevents a second REST consumer on the same flight from re-caching an already consumed ticket', async () => {
    useAuthStore.setState({ user: null, isAuthenticated: true })
    let releaseFetch!: () => void
    let releaseMe!: () => void
    const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input)

      if (url === '/api/auth/refresh') {
        return new Promise<Response>(resolve => {
          releaseFetch = () =>
            resolve(
              new Response(
                JSON.stringify({
                  payload: {
                    ws_token: 'T1',
                    ws_token_exp: EXP,
                    csrf_token: 'csrf-next',
                  },
                }),
                { status: 200 }
              )
            )
        })
      }

      if (url === '/api/auth/me') {
        return new Promise<Response>(resolve => {
          releaseMe = () =>
            resolve(
              new Response(JSON.stringify({ payload: makeUserProfile({ username: 'trader' }) }), {
                status: 200,
              })
            )
        })
      }

      if (fetchMock.mock.calls.filter(([u]) => String(u) === '/api/positions').length === 1) {
        return new Response(null, { status: 401 })
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    vi.stubGlobal('fetch', fetchMock)

    const retryPromise = apiClient.request('/api/positions', { method: 'GET' })

    await Promise.resolve()
    const periodicRefreshPromise = useAuthStore.getState().refreshToken()

    releaseFetch()
    const retryResponse = await retryPromise

    expect(retryResponse.ok).toBe(true)

    const consumedByWs = await getWsToken(socketA, () => true)

    expect(consumedByWs).toEqual({ token: 'T1', exp: Math.floor(Date.parse(EXP) / 1000) })

    releaseMe()
    await periodicRefreshPromise

    expect(consumeWsTicket(0)).toBeNull()
  })

  it('preserves session when refreshAndRetry joins an established socket refresh that hits the 10 s timeout', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/orders') {
        return new Response(null, { status: 401 })
      }

      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })
    })

    vi.stubGlobal('fetch', fetchMock)

    const wsPromise = getWsToken(socketA, () => true)
    const restPromise = apiClient.request('/api/orders', { method: 'GET' })
    const caughtWs = wsPromise.catch((error: unknown) => error)
    const caughtRest = restPromise.catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(10_000)

    const [wsError, restError] = await Promise.all([caughtWs, caughtRest])

    expect(wsError).toBeInstanceOf(WsTicketNetworkError)
    expect((restError as DOMException).name).toBe('TimeoutError')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('preserves the session when a stale-CSRF 403 body is interrupted', async () => {
    apiClient.setCsrfToken('stale-csrf')
    const transportError = new TypeError('Response stream interrupted')
    const response = Response.json({ detail: 'Stale CSRF token' }, { status: 403 })
    const interrupted = response.clone()

    vi.spyOn(interrupted, 'json').mockRejectedValueOnce(transportError)
    vi.spyOn(response, 'clone').mockReturnValueOnce(interrupted)
    const fetchMock = vi.fn().mockResolvedValueOnce(response)

    vi.stubGlobal('fetch', fetchMock)

    await expect(useAuthStore.getState().refreshToken()).rejects.toBe(transportError)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(document.cookie).toContain('csrf_token=stale-csrf')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['REST', 'WebSocket', 'post-logout REST'])(
    'authenticates a new socket after logout and login while the old %s refresh returns 401',
    async owner => {
      vi.useFakeTimers()
      vi.stubGlobal('WebSocket', BrowserLikeWebSocket)
      let releaseOld!: (response: Response) => void
      const oldResponse = new Promise<Response>(resolve => {
        releaseOld = resolve
      })
      const loginUser = makeUserProfile({ username: 'new-trader' })
      const oldRefreshStartsAfterLogout = owner === 'post-logout REST'
      const fetchMock = vi.fn(async (url: string) => {
        if (url === '/api/auth/logout') return new Response(null, { status: 204 })
        if (url === '/api/auth/login') return Response.json({ payload: { user: loginUser } })

        if (fetchMock.mock.calls.filter(([path]) => path === '/api/auth/refresh').length === 1) {
          return oldResponse
        }

        return Response.json(makeTicketPayload('new-session-ticket'))
      })

      vi.stubGlobal('fetch', fetchMock)

      if (oldRefreshStartsAfterLogout) await useAuthStore.getState().logout()
      const oldRefresh =
        owner === 'WebSocket'
          ? getWsToken(socketA, () => true)
          : useAuthStore.getState().refreshToken()

      if (!oldRefreshStartsAfterLogout) await useAuthStore.getState().logout()
      await useAuthStore.getState().login({ username: 'new-trader', password: 'pw' })
      const connection = useWebSocketStore.getState().connect('ws://test/api/ws')
      const [socket] = BrowserLikeWebSocket.instances

      if (!socket) throw new Error('Expected a new WebSocket')

      await vi.advanceTimersByTimeAsync(10)
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/refresh')).toHaveLength(2)
      expect(socket.send).toHaveBeenCalledWith(expect.stringContaining('new-session-ticket'))
      socket.receive(createAuthComplete())
      await connection

      releaseOld(new Response(null, { status: 401 }))
      await expect(oldRefresh).resolves.toBe(owner === 'WebSocket' ? null : false)
      expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, user: loginUser })
      expect(useWebSocketStore.getState().isConnected).toBe(true)
      expect(socket.close).not.toHaveBeenCalled()
    }
  )

  it('unblocks wsTokenFlight after a 200 refresh body stalls past 10 seconds', async () => {
    vi.useFakeTimers()

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => new Promise(() => undefined),
      } as unknown as Response)
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeTicketPayload('recovered')), { status: 200 })
      )

    vi.stubGlobal('fetch', fetchMock)

    const stalled = getWsToken(socketA, () => true)
    const caughtStalled = stalled.catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(10_000)
    const error = await caughtStalled

    expect(error).toBeInstanceOf(WsTicketNetworkError)
    await expect(getWsToken(socketB, () => true)).resolves.toEqual({
      token: 'recovered',
      exp: Math.floor(Date.parse(EXP) / 1000),
    })
  })

  it('prevents a pending periodic refresh from restoring auth after a concurrent WS 401 logout', async () => {
    useAuthStore.setState({ user: null, isAuthenticated: true })
    let releaseMe!: () => void
    const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input)

      if (url === '/api/auth/me') {
        return new Promise<Response>(resolve => {
          releaseMe = () =>
            resolve(
              new Response(JSON.stringify({ payload: makeUserProfile({ username: 'trader' }) }), {
                status: 200,
              })
            )
        })
      }

      if (fetchMock.mock.calls.filter(([u]) => String(u) === '/api/auth/refresh').length === 1) {
        return new Response(
          JSON.stringify({
            payload: {
              csrf_token: 'resurrected-csrf',
            },
          }),
          { status: 200 }
        )
      }

      return new Response(null, { status: 401, statusText: 'Unauthorized' })
    })

    vi.stubGlobal('fetch', fetchMock)

    const periodic = useAuthStore.getState().refreshToken()

    await vi.waitFor(() => expect(releaseMe).toBeDefined())
    const wsClient = new WebSocketClient({ secure: true })
    const fakeSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
    } as unknown as WebSocket

    Reflect.set(wsClient, 'ws', fakeSocket)
    await (
      wsClient as unknown as { performAuthentication: (m: 'authenticate') => Promise<void> }
    ).performAuthentication('authenticate')

    expect(useAuthStore.getState().isAuthenticated).toBe(false)

    releaseMe()
    await periodic

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(consumeWsTicket(0)).toBeNull()
  })

  it('prevents an in-flight refresh from writing ticket, CSRF, or auth state after WS logout', async () => {
    let releaseRefresh!: () => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(resolve => {
          releaseRefresh = () =>
            resolve(
              new Response(
                JSON.stringify({
                  payload: {
                    ws_token: 'resurrected-token',
                    ws_token_exp: EXP,
                    csrf_token: 'resurrected-csrf',
                    user: makeUserProfile({ username: 'trader' }),
                  },
                }),
                { status: 200 }
              )
            )
        })
    )

    vi.stubGlobal('fetch', fetchMock)

    const periodic = useAuthStore.getState().refreshToken()

    await vi.waitFor(() => expect(releaseRefresh).toBeDefined())
    useAuthStore.getState().silentLogout()
    releaseRefresh()
    await periodic

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(consumeWsTicket(0)).toBeNull()
    expect(document.cookie).not.toContain('resurrected-csrf')
  })

  it('closes with 4401 before real silentLogout disconnects and stops useWebSocketConnection loop', async () => {
    vi.useFakeTimers()

    vi.stubGlobal('WebSocket', BrowserLikeWebSocket)
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 401, statusText: 'Unauthorized' })
    )

    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = renderHook(() =>
      useWebSocketConnection('ws://test/api/ws', { retryDelayMs: 5000 })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    expect(BrowserLikeWebSocket.instances[0]?.close).toHaveBeenCalledExactlyOnceWith(
      4401,
      'Authentication failure'
    )
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('cancels the scheduled retry when terminal HTTP 400 arrives just after the store timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', BrowserLikeWebSocket)
    let releaseRefresh!: (response: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(resolve => {
          releaseRefresh = resolve
        })
    )

    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useWebSocketConnection('ws://test/api/ws'))

    await act(async () => vi.advanceTimersByTimeAsync(10_001))
    expect(result.current.error).toBe('Connection timeout')
    await act(async () => releaseRefresh(new Response(null, { status: 400 })))
    expect(result.current.error).toBe('Refresh failed with status 400')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    await act(async () => vi.advanceTimersByTimeAsync(30_000))
    expect(BrowserLikeWebSocket.instances).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([1, 3])(
    'recovers with a valid ticket or stops after three malformed refreshes (%i malformed)',
    async malformedCount => {
      vi.useFakeTimers()
      vi.stubGlobal('WebSocket', BrowserLikeWebSocket)
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const fetchMock = vi.fn().mockImplementation(() => {
        const body =
          fetchMock.mock.calls.length <= malformedCount
            ? { payload: {} }
            : makeTicketPayload('recovered-ticket')

        return Promise.resolve(Response.json(body))
      })

      vi.stubGlobal('fetch', fetchMock)
      const { result } = renderHook(() => useWebSocketConnection('ws://test/api/ws'))
      const [socket] = BrowserLikeWebSocket.instances

      if (!socket) throw new Error('Expected a new WebSocket')

      await act(async () => vi.advanceTimersByTimeAsync(3009))
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(socket.send).not.toHaveBeenCalled()
      await act(async () => vi.advanceTimersByTimeAsync(1))

      if (malformedCount === 1) {
        expect(socket.send).toHaveBeenCalledWith(expect.stringContaining('recovered-ticket'))
        act(() => socket.receive(createAuthComplete()))
        expect(result.current.isConnected).toBe(true)
      } else {
        await act(async () => vi.advanceTimersByTimeAsync(4500))
        expect(socket.send).not.toHaveBeenCalled()
        expect(socket.close).toHaveBeenCalledExactlyOnceWith(4401, 'Authentication failure')
        expect(result.current.error).toBe('Invalid ws_token response from refresh endpoint')
      }

      await act(async () => vi.advanceTimersByTimeAsync(30_000))
      expect(BrowserLikeWebSocket.instances).toHaveLength(1)
      expect(fetchMock).toHaveBeenCalledTimes(malformedCount === 1 ? 2 : 3)
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    }
  )

  it('lets a replacement socket use a cached ticket from an independent REST-only flight', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeTicketPayload('old-ws-token')), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            payload: {
              ws_token: 'rest-only-token',
              ws_token_exp: EXP,
              csrf_token: 'csrf-next',
              user: makeUserProfile({
                username: 'trader',
                active_wallet_public_id: 'w-main',
              }),
            },
          }),
          { status: 200 }
        )
      )

    vi.stubGlobal('fetch', fetchMock)

    let releaseOldForWs!: () => void
    const originalRefreshSession = apiClient.refreshSession.bind(apiClient)
    const refreshSpy = vi
      .spyOn(apiClient, 'refreshSession')
      .mockImplementationOnce(async (body, options) => {
        const response = await originalRefreshSession(body, options)

        await new Promise<void>(resolve => {
          releaseOldForWs = resolve
        })

        return response
      })

    const oldPromise = getWsToken(socketA, () => true)
    const replacementPromise = getWsToken(socketB, () => true)

    await vi.waitFor(() => expect(releaseOldForWs).toBeDefined())
    await useAuthStore.getState().refreshToken({ walletId: 'w-main' })
    releaseOldForWs()
    refreshSpy.mockRestore()

    await expect(oldPromise).resolves.toMatchObject({ token: 'old-ws-token' })
    await expect(replacementPromise).resolves.toEqual({
      token: 'rest-only-token',
      exp: Math.floor(Date.parse(EXP) / 1000),
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
