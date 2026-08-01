import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import { MessageResponseSchema, UserListResponseSchema } from '../schemas/api.generated.zod'
import type { MessageResponse, UserListResponse } from '../../types/api'

const DESK_MEMBERS_ENDPOINT = '/api/auth/desks/:operator_public_id/members'
const DESK_MEMBER_ENDPOINT = `${DESK_MEMBERS_ENDPOINT}/:username`

const deskMembersPath = (operatorPublicId: string): string =>
  `/api/auth/desks/${encodeURIComponent(operatorPublicId)}/members`

const deskMemberPath = (operatorPublicId: string, username: string): string =>
  `${deskMembersPath(operatorPublicId)}/${encodeURIComponent(username)}`

export async function getDeskMembers(
  operatorPublicId: string,
  asOf: string | null = null
): Promise<UserListResponse> {
  const basePath = deskMembersPath(operatorPublicId)
  const path = asOf === null ? basePath : `${basePath}?as_of=${encodeURIComponent(asOf)}`
  const data = await apiClient.requestJSON(path, { method: 'GET' })

  return validateResponse(data, UserListResponseSchema, DESK_MEMBERS_ENDPOINT)
}

export async function attachViewerToDesk(
  operatorPublicId: string,
  username: string
): Promise<MessageResponse> {
  const path = deskMemberPath(operatorPublicId, username)
  const data = await apiClient.requestJSON(path, { method: 'POST' })

  return validateResponse(data, MessageResponseSchema, `${DESK_MEMBER_ENDPOINT} POST`)
}

export async function detachViewerFromDesk(
  operatorPublicId: string,
  username: string
): Promise<MessageResponse> {
  const path = deskMemberPath(operatorPublicId, username)
  const data = await apiClient.requestJSON(path, { method: 'DELETE' })

  return validateResponse(data, MessageResponseSchema, `${DESK_MEMBER_ENDPOINT} DELETE`)
}
