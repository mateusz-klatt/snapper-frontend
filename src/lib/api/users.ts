import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  UserListResponseSchema,
  UserResponseSchema,
  MessageResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  UserListResponse,
  UserResponse,
  CreateUserBody,
  UpdateUserBody,
  AdminResetPasswordBody,
  ChangePasswordBody,
} from '../../types/api'

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ payload: string }> {
  const body: ChangePasswordBody = {
    current_password: currentPassword,
    new_password: newPassword,
  }
  const data = await apiClient.postJSON(
    `/api/auth/users/${encodeURIComponent(userId)}/change-password`,
    body
  )

  return validateResponse(data, MessageResponseSchema, '/auth/users/:id/change-password')
}

export async function listUsers(includeInactive: boolean): Promise<UserListResponse> {
  const data = await apiClient.getJSON(`/api/auth/users?include_inactive=${includeInactive}`)

  return validateResponse(data, UserListResponseSchema, '/auth/users')
}

export async function createUser(body: CreateUserBody): Promise<UserResponse> {
  const data = await apiClient.postJSON('/api/auth/users', body)

  return validateResponse(data, UserResponseSchema, '/auth/users POST')
}

export async function updateUser(userId: string, body: UpdateUserBody): Promise<UserResponse> {
  const data = await apiClient.postJSON(
    `/api/auth/users/${encodeURIComponent(userId)}/update`,
    body
  )

  return validateResponse(data, UserResponseSchema, '/auth/users/:id/update')
}

export async function deactivateUser(userId: string): Promise<{ payload: string }> {
  const data = await apiClient.postJSON(
    `/api/auth/users/${encodeURIComponent(userId)}/deactivate`,
    {}
  )

  return validateResponse(data, MessageResponseSchema, '/auth/users/:id/deactivate')
}

export async function adminResetPassword(
  userId: string,
  body: AdminResetPasswordBody
): Promise<{ payload: string }> {
  const data = await apiClient.postJSON(
    `/api/auth/users/${encodeURIComponent(userId)}/admin-reset-password`,
    body
  )

  return validateResponse(data, MessageResponseSchema, '/auth/users/:id/admin-reset-password')
}
