import type { ZodType } from 'zod'
import { attachDisplayFields, detachDisplayFields } from '../displayFields'

class ApiValidationError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly zodError: unknown
  ) {
    super(`API response validation failed for ${endpoint}`)
    this.name = 'ApiValidationError'
  }
}

export function validateResponse<T>(data: unknown, schema: ZodType<T>, endpoint: string): T {
  const displayFields = detachDisplayFields(data)
  const result = schema.safeParse(data)

  if (!result.success) {
    attachDisplayFields(data, displayFields)
    console.error(`API validation failed for ${endpoint}:`, result.error.issues)
    throw new ApiValidationError(endpoint, result.error)
  }

  attachDisplayFields(result.data, displayFields)
  attachDisplayFields(data, displayFields)

  return result.data
}
