import { apiClient } from '../apiClient'
import { APIError, isTransientRefreshTransportError } from '../api/error'
import { consumeWsTicket } from '../wsTicketCache'
import { AuthControlMessageType, RefreshWsTokenResponse, AUTH_CONTROL_MESSAGES } from './types'

export function isAuthControlMessage(message: { type: string }): boolean {
  return AUTH_CONTROL_MESSAGES.has(message.type as AuthControlMessageType)
}

type WsTicket = { token: string; exp: number }

let wsTokenFlight: { socket: WebSocket; ticket: Promise<WsTicket> } | null = null

export class WsTicketNetworkError extends TypeError {}

async function refreshWsToken(): Promise<WsTicket> {
  let response: Response

  try {
    response = await apiClient.refreshSession(undefined, { claimWsTicket: true })
  } catch (error) {
    if (isTransientRefreshTransportError(error)) {
      throw new WsTicketNetworkError(error.message, { cause: error })
    }

    throw error
  }

  if (!response.ok) {
    throw new APIError(
      `Refresh failed with status ${response.status}`,
      response.status,
      response.statusText
    )
  }

  let envelope: RefreshWsTokenResponse

  try {
    envelope = (await response.json()) as RefreshWsTokenResponse
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')
    ) {
      throw new WsTicketNetworkError(error.message, { cause: error })
    }

    throw error
  }

  const data = envelope?.payload

  if (!data || typeof data.ws_token !== 'string' || typeof data.ws_token_exp !== 'string') {
    throw new Error('Invalid ws_token response from refresh endpoint')
  }

  return { token: data.ws_token, exp: Math.floor(new Date(data.ws_token_exp).getTime() / 1000) }
}

/**
 * Keep refresh tickets with the socket that requested them. A replacement waits for the API
 * refresh to settle and discards any cached ticket unless ownership shows it came from an
 * independent REST-only flight.
 */
export async function getWsToken(
  socket: WebSocket,
  isCurrent: () => boolean
): Promise<WsTicket | null> {
  const startedDuringRefresh = wsTokenFlight !== null

  while (wsTokenFlight && wsTokenFlight.socket !== socket) {
    await wsTokenFlight.ticket.catch(() => undefined)
  }

  if (!isCurrent()) return null
  if (wsTokenFlight) return wsTokenFlight.ticket

  const cachedTicket = consumeWsTicket()

  if (
    cachedTicket &&
    (!startedDuringRefresh || apiClient.consumeIndependentRestTicket?.(cachedTicket.token))
  ) {
    return cachedTicket
  }

  const ticket = refreshWsToken().finally(() => {
    wsTokenFlight = null
  })

  wsTokenFlight = { socket, ticket }

  return ticket
}
