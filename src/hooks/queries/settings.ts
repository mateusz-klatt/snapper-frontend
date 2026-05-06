import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSettings,
  getSettingCategories,
  updateSetting,
  removeSetting,
} from '../../lib/api/settings'
import { useAppStore } from '../../stores/app'
import { useAuth } from '../../stores/auth'
import type { SettingResponse, SettingUpdateBody } from '../../types/api'
import { queryKeys } from './keys'

export const useSettings = (category?: string) => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery({
    queryKey: queryKeys.settings(category, asOf),
    queryFn: () => getSettings(category),
    select: data => data.payload,
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useSettingCategories = () => {
  const { isAuthenticated } = useAuth()
  const asOf = useAppStore(s => s.asOf)

  return useQuery<string[]>({
    queryKey: queryKeys.settingCategories(asOf),
    queryFn: () => getSettingCategories(),
    enabled: isAuthenticated,
    throwOnError: false,
  })
}

export const useUpdateSetting = () => {
  const queryClient = useQueryClient()

  return useMutation<SettingResponse, Error, { key: string; data: SettingUpdateBody }>({
    mutationFn: ({ key, data }) => updateSetting(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export const useDeleteSetting = () => {
  const queryClient = useQueryClient()

  return useMutation<{ payload: string }, Error, string>({
    mutationFn: key => removeSetting(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
