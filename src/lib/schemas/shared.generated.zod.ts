/**
 * Generated Zod fragments shared by REST and WebSocket schemas.
 * DO NOT EDIT - regenerate with: make ui-gen-types
 */

import { z } from 'zod/v4'

export const PositionDisplayFieldsSchema = z
  .object({
    is_dust: z.boolean().optional(),
    quantity_decimals: z.number().int().nullable().optional(),
    price_decimals: z.number().int().nullable().optional(),
  })
  .strict()
