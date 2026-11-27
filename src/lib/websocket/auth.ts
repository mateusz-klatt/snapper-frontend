import { apiClient } from '../apiClient'
import { APIError, isTransientRefreshTransportError } from '../api/error'
import { consumeWsTicket } from '../wsTicketCache'
import { calculateReconnectDelay } from './reconnect'
import { AuthControlMessageType, RefreshWsTokenResponse, AUTH_CONTROL_MESSAGES } from './types'

export function isAuthControlMessage(message: { type: string }): boolean {
  return AUTH_CONTROL_MESSAGES.has(message.type as AuthControlMessageType)
}

type WsTicket = { token: string; exp: number }

const wsTokenFlights = new Map<number, { socket: WebSocket; ticket: Promise<WsTicket | null> }>()
const MAX_TICKET_ATTEMPTS = 3
const TICKET_RETRY_INTERVAL_MS = 3000

export class WsTicketNetworkError extends TypeError {}
export class MalformedWsTicketError extends Error {}

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
    throw new MalformedWsTicketError('Invalid ws_token response from refresh endpoint')
  }

  return { token: data.ws_token, exp: Math.floor(new Date(data.ws_token_exp).getTime() / 1000) }
}

async function refreshWsTokenWithRetry(
  epoch: number,
  isCurrent: () => boolean
): Promise<WsTicket | null> {
  let attempt = 1

  while (true) {
    try {
      const ticket = await refreshWsToken()

      return epoch === apiClient.getSessionEpoch() ? ticket : null
    } catch (error) {
      if (epoch !== apiClient.getSessionEpoch()) return null
      if (!(error instanceof MalformedWsTicketError) || attempt >= MAX_TICKET_ATTEMPTS) throw error
    }

    const delay = calculateReconnectDelay(attempt++, TICKET_RETRY_INTERVAL_MS)

    await new Promise<void>(resolve => setTimeout(resolve, delay))

    if (!isCurrent() || epoch !== apiClient.getSessionEpoch()) return null
  }
}

/**
 * Keep refresh tickets with the socket that requested them. A replacement in the same session
 * waits for the ticket flight to settle and discards any cached ticket unless ownership shows
 * it came from an independent REST-only flight.
 */
export async function getWsToken(
  socket: WebSocket,
  isCurrent: () => boolean
): Promise<WsTicket | null> {
  const epoch = apiClient.getSessionEpoch()
  let flight = wsTokenFlights.get(epoch)
  const startedDuringRefresh = flight !== undefined

  while (flight && flight.socket !== socket) {
    await flight.ticket.catch(() => undefined)
    flight = wsTokenFlights.get(epoch)
  }

  if (!isCurrent() || epoch !== apiClient.getSessionEpoch()) return null
  if (flight) return flight.ticket

  const cachedTicket = consumeWsTicket()

  if (
    cachedTicket &&
    (!startedDuringRefresh || apiClient.consumeIndependentRestTicket(cachedTicket.token))
  ) {
    return cachedTicket
  }

  const ticket = refreshWsTokenWithRetry(epoch, isCurrent).finally(() => {
    wsTokenFlights.delete(epoch)
  })

  wsTokenFlights.set(epoch, { socket, ticket })

  return ticket
}
