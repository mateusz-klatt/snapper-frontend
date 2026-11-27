import { apiClient } from '../apiClient'
import { APIError } from '../api/error'
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
    response = await apiClient.refreshSession()
  } catch (error) {
    if (error instanceof TypeError) {
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

  const envelope = (await response.json()) as RefreshWsTokenResponse
  const data = envelope?.payload

  if (!data || typeof data.ws_token !== 'string' || typeof data.ws_token_exp !== 'string') {
    throw new Error('Invalid ws_token response from refresh endpoint')
  }

  return { token: data.ws_token, exp: Math.floor(new Date(data.ws_token_exp).getTime() / 1000) }
}

/**
 * Keep refresh tickets with the socket that requested them. A replacement waits for the API
 * refresh to settle and discards any cached ticket that could have come from that flight.
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

  if (cachedTicket && !startedDuringRefresh) return cachedTicket

  const ticket = refreshWsToken().finally(() => {
    wsTokenFlight = null
  })

  wsTokenFlight = { socket, ticket }

  return ticket
}
