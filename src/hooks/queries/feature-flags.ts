import { useQuery } from '@tanstack/react-query'
import { getFeatureFlags } from '../../lib/api/feature-flags'
import { useAuth } from '../../stores/auth'
import { queryKeys } from './keys'

export function useFeatureFlags(): { isEnabled: boolean; isLoading: boolean } {
  const { isAuthenticated } = useAuth()
  const query = useQuery({
    queryKey: queryKeys.featureFlags(),
    queryFn: () => getFeatureFlags(),
    enabled: isAuthenticated,
    throwOnError: false,
    select: data => data.payload.ai_integration_enabled === true,
  })

  return {
    isEnabled: query.data === true,
    isLoading: query.isLoading,
  }
}
