/**
 * User-facing error-code map for order-entry submit responses.
 *
 * Maps backend ``error_code`` strings returned by the order-submit capability
 * guard and REST handlers to i18n key suffixes under
 * ``orders:newOrderModal.errorCodes``. Consumed by ``NewOrderModal`` +
 * bracket/trailing-stop dialogs when they branch on
 * ``APIError.details.error_code``.
 *
 * Keys must stay in sync with the backend's capability guard. Unknown
 * codes fall back to ``APIError.message`` which already carries the
 * ``reason`` from the structured 422 detail.
 */
export const ORDER_ERROR_CODE_KEYS: Readonly<Record<string, string>> = {
  instrument_market_data_only: 'instrumentMarketDataOnly',
  unknown_instrument: 'unknownInstrument',
  caps_violation: 'capsViolation',
}

/**
 * Extract the ``error_code`` from an ``APIError.details`` object, if present.
 *
 * Returns ``null`` when ``details`` is absent, not a structured object, or
 * lacks an ``error_code`` string — matches the non-guard 422 paths
 * (Pydantic validation errors, plain-string 500s) without crashing.
 */
export function extractErrorCode(details: unknown): string | null {
  if (details === null || typeof details !== 'object') {
    return null
  }

  const code = (details as { error_code?: unknown }).error_code

  return typeof code === 'string' ? code : null
}

/**
 * Map an ``APIError``'s ``details.error_code`` to a translation key suffix
 * under ``orders:newOrderModal.errorCodes``.
 *
 * Returns ``null`` when the code is unknown so the caller can fall back to
 * ``APIError.message``.
 */
export function lookupOrderErrorMessageKey(details: unknown): string | null {
  const code = extractErrorCode(details)

  if (code === null) {
    return null
  }

  return ORDER_ERROR_CODE_KEYS[code] ?? null
}
