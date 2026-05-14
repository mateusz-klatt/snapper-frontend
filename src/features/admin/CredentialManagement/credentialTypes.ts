export const CREDENTIAL_TYPE_VALUES = ['api_key_secret', 'rsa_pem', 'oauth', 'paper'] as const

export type CredentialType = (typeof CREDENTIAL_TYPE_VALUES)[number]

export type CredentialField =
  | 'api_key'
  | 'api_secret'
  | 'private_key_pem'
  | 'client_id'
  | 'client_secret'
  | 'refresh_token'
  | 'initial_balance'

const REQUIRED_CREDENTIAL_FIELDS: Readonly<Record<CredentialType, readonly CredentialField[]>> = {
  api_key_secret: ['api_key', 'api_secret'],
  rsa_pem: ['api_key', 'private_key_pem'],
  oauth: ['client_id', 'client_secret', 'refresh_token'],
  paper: ['initial_balance'],
}

const CREDENTIAL_TYPE_SET: ReadonlySet<string> = new Set(CREDENTIAL_TYPE_VALUES)

export const isCredentialType = (value: string | null | undefined): value is CredentialType =>
  typeof value === 'string' && CREDENTIAL_TYPE_SET.has(value)

export const credentialFieldsFor = (
  value: string | null | undefined
): readonly CredentialField[] => {
  if (isCredentialType(value)) {
    return REQUIRED_CREDENTIAL_FIELDS[value]
  }

  return []
}
