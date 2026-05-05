const THESIS_SNIPPET_MAX_LENGTH = 140

/**
 * Pure helper extracted for unit testing — pulls a short
 * human-readable snippet out of the strategy's signal envelope so
 * the AI delegate can read the gist of a CONSULT request without
 * opening the detail page.
 *
 * The envelope is intentionally schema-loose
 * (``Record<string, unknown> | null | undefined``) because the
 * strategies that populate it evolve faster than the OpenAPI
 * schema. Looks for a ``thesis`` string first; falls back to
 * ``side`` (e.g. "buy" / "sell") when only the direction is
 * recorded; returns ``null`` when neither is present so the cell
 * can render a "—" placeholder.
 *
 * Lives in its own module so the parent `AiReviewInbox.tsx` only
 * exports React components — Vite's React Fast Refresh emits a
 * warning otherwise (mixed component / non-component exports
 * break HMR boundary detection).
 */
export function pendingReviewThesisSnippet(
  envelope: Record<string, unknown> | null | undefined
): string | null {
  if (envelope == null) {
    return null
  }

  const thesis = envelope['thesis']

  if (typeof thesis === 'string' && thesis.trim() !== '') {
    return thesis.length > THESIS_SNIPPET_MAX_LENGTH
      ? `${thesis.slice(0, THESIS_SNIPPET_MAX_LENGTH).trimEnd()}…`
      : thesis
  }

  const side = envelope['side']

  if (typeof side === 'string' && side.trim() !== '') {
    return side.toUpperCase()
  }

  return null
}
