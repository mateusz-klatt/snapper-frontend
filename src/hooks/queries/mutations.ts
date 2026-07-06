import {
  useMutation,
  useQueryClient,
  type MutationFunction,
  type QueryKey,
} from '@tanstack/react-query'

type InvalidationKey<TData, TVariables> =
  QueryKey | ((data: TData, variables: TVariables) => QueryKey)

interface InvalidatingMutationOptions<TData, TVariables> {
  mutationFn: MutationFunction<TData, TVariables>
  invalidate: InvalidationKey<TData, TVariables>
}

export const useInvalidatingMutation = <TData, TVariables>({
  mutationFn,
  invalidate,
}: Readonly<InvalidatingMutationOptions<TData, TVariables>>) => {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      const queryKey = typeof invalidate === 'function' ? invalidate(data, variables) : invalidate

      queryClient.invalidateQueries({ queryKey })
    },
  })
}
