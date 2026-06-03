import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBacktests,
  getBacktest,
  getBacktestStrategyClasses,
  createBacktest,
  cancelBacktest,
  rerunBacktest,
  getBacktestTrades,
  getBacktestSignals,
  createBacktestComparison,
  getBacktestComparison,
  getBacktestComparisons,
} from '../../lib/api/backtests'
import { APIError } from '../../lib/api/error'
import { useAppStore } from '../../stores/app'
import type { BacktestCompareBody } from '../../types/api'
import { queryKeys } from './keys'

export const useBacktests = (strategy?: string, status?: string) => {
  return useQuery({
    queryKey: queryKeys.backtestsByStrategyStatus(strategy, status),
    queryFn: () => getBacktests(50, 0, strategy, status),
  })
}

export const useBacktestStrategyClasses = (enabled: boolean) => {
  return useQuery({
    queryKey: queryKeys.backtestStrategyClasses,
    queryFn: () => getBacktestStrategyClasses(),
    staleTime: Infinity,
    enabled,
  })
}

/**
 * Auto-pair candidate lookup — returns recent terminal runs sharing
 * the same pairing-stable `config_hash` as the current run. Used by
 * CompareLauncher to seed the manual-pair combobox and gate the
 * "compare with most recent" button.
 *
 * Disabled (enabled: false) when `configHash` is `null` — older runs
 * have no hash and auto-pair is not applicable.
 */
export const useBacktestRunsByConfigHash = (configHash: string | null, limit: number = 20) => {
  return useQuery({
    queryKey: queryKeys.backtestsByConfigHash(configHash, limit),
    queryFn: () => getBacktests(limit, 0, undefined, undefined, configHash),
    enabled: configHash !== null,
  })
}

export const useBacktest = (runId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.backtest(runId),
    queryFn: () => getBacktest(runId as string),
    enabled: !!runId,
  })
}

export const useBacktestTrades = (runId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.backtestTrades(runId),
    queryFn: () => getBacktestTrades(runId as string),
    enabled: !!runId,
  })
}

export const useBacktestSignals = (runId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.backtestSignals(runId),
    queryFn: () => getBacktestSignals(runId as string),
    enabled: !!runId,
  })
}

export const useCreateBacktest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Parameters<typeof createBacktest>[0]) => createBacktest(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backtestsAll })
    },
  })
}

export const useBacktestComparison = (comparisonId: string | undefined) => {
  const walletId = useAppStore(s => s.currentWalletPublicId)

  return useQuery({
    queryKey: queryKeys.backtestCompare(walletId, comparisonId),
    queryFn: () => getBacktestComparison(comparisonId as string),
    enabled: !!comparisonId,
    retry: (failureCount, error) => {
      if (error instanceof APIError && error.status === 404) return false

      return failureCount < 3
    },
  })
}

export const useBacktestComparisons = (limit: number = 20, offset: number = 0) => {
  const walletId = useAppStore(s => s.currentWalletPublicId)

  return useQuery({
    queryKey: queryKeys.backtestCompareList(walletId, limit, offset),
    queryFn: () => getBacktestComparisons(limit, offset),
  })
}

export const useCreateBacktestComparison = () => {
  const queryClient = useQueryClient()
  const walletId = useAppStore(s => s.currentWalletPublicId)

  return useMutation({
    mutationFn: (body: BacktestCompareBody) => createBacktestComparison(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backtestCompareListForWallet(walletId) })
    },
  })
}

export const useCancelBacktest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (runId: string) => cancelBacktest(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backtestsAll })
    },
  })
}

export const useRerunBacktest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (runId: string) => rerunBacktest(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backtestsAll })
    },
  })
}
