/**
 * Format a millisecond duration as an adaptive, human-readable string.
 *
 * Sub-second stays in ms; then rolls up to seconds, minutes, and hours so a
 * stale value reads as "1h 29m" instead of a wall of milliseconds. The unit
 * suffixes (ms/s/m/h) are intentionally untranslated — universal like MB/GB.
 *
 * @param ms - a non-negative duration in milliseconds
 * @returns e.g. "0ms", "627ms", "1.7s", "5m 12s", "1h 29m"
 */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`

  const seconds = ms / 1000

  if (seconds < 60) return `${seconds.toFixed(1)}s`

  const totalMinutes = Math.floor(seconds / 60)

  if (totalMinutes < 60) return `${totalMinutes}m ${Math.round(seconds % 60)}s`

  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}
