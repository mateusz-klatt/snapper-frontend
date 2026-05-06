import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  adminResetPassword,
  changePassword,
} from '../../lib/api/users'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import type {
  UserListResponse,
  UserResponse,
  CreateUserBody,
  UpdateUserBody,
  AdminResetPasswordBody,
} from '../../types/api'
import { queryKeys } from './keys'

export const useUsers = (includeInactive: boolean) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery<UserListResponse>({
    queryKey: queryKeys.users(includeInactive, asOf),
    queryFn: () => listUsers(includeInactive),
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation<UserResponse, Error, CreateUserBody>({
    mutationFn: data => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation<UserResponse, Error, { userId: string; data: UpdateUserBody }>({
    mutationFn: ({ userId, data }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useDeactivateUser = () => {
  const queryClient = useQueryClient()

  return useMutation<{ payload: string }, Error, string>({
    mutationFn: userId => deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useAdminResetPassword = () => {
  const queryClient = useQueryClient()

  return useMutation<{ payload: string }, Error, { userId: string; data: AdminResetPasswordBody }>({
    mutationFn: ({ userId, data }) => adminResetPassword(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useChangePassword = () =>
  useMutation<
    { payload: string },
    Error,
    { userId: string; currentPassword: string; newPassword: string }
  >({
    mutationFn: ({ userId, currentPassword, newPassword }) =>
      changePassword(userId, currentPassword, newPassword),
  })
