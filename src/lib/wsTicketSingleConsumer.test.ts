import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from './apiClient'
import { getWsToken } from './websocket/auth'
import { consumeWsTicket, storeWsTicket } from './wsTicketCache'
import { useAuthStore } from '../stores/auth'
import { makeUserProfile } from '../test/factories'

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

function makeControlledCloneResponse(
  payload: unknown,
  deferredCallerIndex: 0 | 1
): { response: Response; releaseDeferred: () => void } {
  let releaseDeferred = (): void => undefined
  let nextCallerIndex = 0

  const makeCallerResponse = (callerIndex: number): Response =>
    ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => {
        if (callerIndex === deferredCallerIndex) {
          return new Promise(resolve => {
            releaseDeferred = () => resolve(payload)
          })
        }

        return Promise.resolve(payload)
      },
      clone: () => makeCallerResponse(callerIndex),
    }) as unknown as Response

  const root = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(payload),
    clone: () => makeCallerResponse(nextCallerIndex++),
  } as unknown as Response

  return {
    response: root,
    releaseDeferred: () => releaseDeferred(),
  }
}

describe('single-consumer ws_token ownership across concurrent refresh paths', () => {
  const socketA = {} as WebSocket
  const socketB = {} as WebSocket

  beforeEach(() => {
    storeWsTicket(null)
    apiClient.clearCSRFToken()
    useAuthStore.setState({
      user: makeUserProfile({ username: 'trader' }),
      isAuthenticated: true,
      csrfToken: null,
      error: null,
    })
  })

  afterEach(() => {
    storeWsTicket(null)
    apiClient.clearCSRFToken()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([0, 1] as const)(
    'delivers ws_token only to WS when WS starts and authStore.refreshToken joins (deferred caller %s)',
    async deferredCallerIndex => {
      let releaseFetch!: () => void
      const controlled = makeControlledCloneResponse(makeTicketPayload('T1'), deferredCallerIndex)
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>(resolve => {
              releaseFetch = () => resolve(controlled.response)
            })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(makeTicketPayload('T2')), { status: 200 })
        )

      vi.stubGlobal('fetch', fetchMock)

      const wsPromise = getWsToken(socketA, () => true)
      const restPromise = useAuthStore.getState().refreshToken()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      releaseFetch()

      if (deferredCallerIndex === 0) {
        await restPromise
        expect(consumeWsTicket(0)).toBeNull()
        controlled.releaseDeferred()
      } else {
        const fastTicket = await wsPromise

        expect(fastTicket).toEqual({ token: 'T1', exp: Math.floor(Date.parse(EXP) / 1000) })
        controlled.releaseDeferred()
      }

      const [ticket] = await Promise.all([wsPromise, restPromise])

      expect(ticket).toEqual({ token: 'T1', exp: Math.floor(Date.parse(EXP) / 1000) })
      expect(consumeWsTicket(0)).toBeNull()

      const nextTicket = await getWsToken(socketB, () => true)

      expect(nextTicket).toEqual({ token: 'T2', exp: Math.floor(Date.parse(EXP) / 1000) })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    }
  )

  it.each([0, 1] as const)(
    'delivers ws_token only to WS when authStore.refreshToken starts and WS joins (deferred caller %s)',
    async deferredCallerIndex => {
      let releaseFetch!: () => void
      const controlled = makeControlledCloneResponse(makeTicketPayload('T1'), deferredCallerIndex)
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Response>(resolve => {
              releaseFetch = () => resolve(controlled.response)
            })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(makeTicketPayload('T2')), { status: 200 })
        )

      vi.stubGlobal('fetch', fetchMock)

      const restPromise = useAuthStore.getState().refreshToken()
      const wsPromise = getWsToken(socketA, () => true)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      releaseFetch()

      if (deferredCallerIndex === 0) {
        const fastTicket = await wsPromise

        expect(fastTicket).toEqual({ token: 'T1', exp: Math.floor(Date.parse(EXP) / 1000) })
        controlled.releaseDeferred()
      } else {
        await restPromise
        expect(consumeWsTicket(0)).toBeNull()
        controlled.releaseDeferred()
      }

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
    let releaseFetch!: () => void
    const controlled = makeControlledCloneResponse(makeTicketPayload('T1'), 1)
    const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      if (String(input) === '/api/auth/refresh') {
        return new Promise<Response>(resolve => {
          releaseFetch = () => resolve(controlled.response)
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

    controlled.releaseDeferred()
    await periodicRefreshPromise

    expect(consumeWsTicket(0)).toBeNull()
  })
})
