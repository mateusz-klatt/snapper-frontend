import { QueryClient } from '@tanstack/react-query'
import { calculateRetryDelay, shouldRetryQuery } from './queryRetry'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 5,
      retry: shouldRetryQuery,
      retryDelay: calculateRetryDelay,
    },
  },
})
