import { useQuery } from '@tanstack/react-query'
import {
  attachViewerToDesk,
  detachViewerFromDesk,
  getDeskMembers,
} from '../../lib/api/desk-memberships'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import { Permission } from '../../types/permissions.generated'
import type { MessageResponse, UserListResponse } from '../../types/api'
import { queryKeys } from './keys'
import { useInvalidatingMutation } from './mutations'

export interface DeskMembershipTarget {
  readonly operatorPublicId: string
  readonly username: string
}

export const useDeskMembers = (operatorPublicId: string) => {
  const { isAuthenticated, hasPermission } = useAuth()
  const asOf = useAppStore(state => state.asOf)
  const canManage = hasPermission(Permission.MANAGE_DESK_MEMBERSHIPS)

  return useQuery<UserListResponse>({
    queryKey: queryKeys.deskMembers(operatorPublicId, asOf),
    queryFn: () => getDeskMembers(operatorPublicId, asOf),
    enabled: isAuthenticated && canManage && operatorPublicId.length > 0,
    staleTime: 30 * 1000,
    throwOnError: false,
  })
}

export const useAttachViewerToDesk = () =>
  useInvalidatingMutation<MessageResponse, DeskMembershipTarget>({
    mutationFn: target => attachViewerToDesk(target.operatorPublicId, target.username),
    invalidate: (_data, target) => queryKeys.deskMembersForDesk(target.operatorPublicId),
  })

export const useDetachViewerFromDesk = () =>
  useInvalidatingMutation<MessageResponse, DeskMembershipTarget>({
    mutationFn: target => detachViewerFromDesk(target.operatorPublicId, target.username),
    invalidate: queryKeys.deskMembersAll,
  })
