import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import { OperatorListResponseSchema, WalletListResponseSchema } from '../schemas/api.generated.zod'
import type { OperatorListResponse, WalletListResponse } from '../../types/api'

export async function getOperators(): Promise<OperatorListResponse> {
  const data = await apiClient.getJSON('/api/operators')

  return validateResponse(data, OperatorListResponseSchema, '/operators')
}

export async function getWallets(): Promise<WalletListResponse> {
  const data = await apiClient.getJSON('/api/wallets')

  return validateResponse(data, WalletListResponseSchema, '/wallets')
}
