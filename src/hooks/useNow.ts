import { useEffect, useState } from 'react'

/**
 * Wall-clock epoch (ms) that advances on a fixed interval.
 *
 * Venue-account authority is time-bounded (``authoritative_until``), so the
 * client must be able to DEMOTE a once-authoritative row to stale purely
 * because wall-clock time has passed the window — with no refetch and no new
 * data. A ticking ``now`` drives that re-derivation on every interval.
 *
 * @param intervalMs How often to advance the clock, in milliseconds.
 * @returns The current epoch time in milliseconds, updated every ``intervalMs``.
 */
export const useNow = (intervalMs: number): number => {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)

    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
