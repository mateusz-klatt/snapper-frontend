import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  OperatorListResponseSchema,
  OperatorResponseSchema,
  WalletListResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  CreateOperatorBody,
  OperatorListResponse,
  OperatorResponse,
  WalletListResponse,
} from '../../types/api'

export async function getOperators(): Promise<OperatorListResponse> {
  const data = await apiClient.getJSON('/api/operators')

  return validateResponse(data, OperatorListResponseSchema, '/operators')
}

export async function createOperator(body: CreateOperatorBody): Promise<OperatorResponse> {
  const data = await apiClient.postJSON('/api/operators', body)

  return validateResponse(data, OperatorResponseSchema, '/operators POST')
}

export async function getWallets(): Promise<WalletListResponse> {
  const data = await apiClient.getJSON('/api/wallets')

  return validateResponse(data, WalletListResponseSchema, '/wallets')
}
