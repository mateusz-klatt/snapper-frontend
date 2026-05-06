import { apiClient } from '../apiClient'
import { validateResponse } from '../schemas/api'
import {
  CredentialListResponseSchema,
  CredentialResponseSchema,
} from '../schemas/api.generated.zod'
import type {
  CredentialListResponse,
  CredentialResponse,
  CreateCredentialBody,
  RotateCredentialBody,
} from '../../types/api'

export async function getCredentials(walletPublicId: string): Promise<CredentialListResponse> {
  let url = `/api/wallets/${encodeURIComponent(walletPublicId)}/credentials`
  const asOf = apiClient.getTimeTravelAsOf()

  if (asOf) {
    url = `${url}?as_of=${encodeURIComponent(asOf)}`
  }

  const data = await apiClient.requestJSON(url, { method: 'GET' })

  return validateResponse(data, CredentialListResponseSchema, '/wallets/:id/credentials')
}

export async function createCredential(
  walletPublicId: string,
  body: CreateCredentialBody
): Promise<CredentialResponse> {
  const data = await apiClient.postJSON(
    `/api/wallets/${encodeURIComponent(walletPublicId)}/credentials`,
    body
  )

  return validateResponse(data, CredentialResponseSchema, '/wallets/:id/credentials POST')
}

export async function rotateCredential(
  walletPublicId: string,
  credentialPublicId: string,
  body: RotateCredentialBody
): Promise<CredentialResponse> {
  const data = await apiClient.postJSON(
    `/api/wallets/${encodeURIComponent(walletPublicId)}/credentials/${encodeURIComponent(credentialPublicId)}/rotate`,
    body
  )

  return validateResponse(
    data,
    CredentialResponseSchema,
    '/wallets/:id/credentials/:id/rotate POST'
  )
}
