export function getCookie(name: string): string {
  const prefix = name + '='

  return (
    document.cookie
      .split('; ')
      .find(c => c.startsWith(prefix))
      ?.slice(prefix.length) ?? ''
  )
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString('en-US', options)
}

const BYTES_PER_KIB = 1024
const BYTES_PER_MIB = BYTES_PER_KIB * 1024
const BYTES_PER_GIB = BYTES_PER_MIB * 1024

/**
 * Render a byte count as a binary-base human string.
 *
 * Values below one kibibyte are shown as bytes, below one mebibyte as
 * kibibytes, below one gibibyte as mebibytes, and larger values as
 * gibibytes. Pure and i18n-free so callers can wrap it in their own
 * translation layer.
 */
export function formatBytes(bytes: number): string {
  const absBytes = Math.abs(bytes)

  if (absBytes < BYTES_PER_KIB) {
    return `${bytes.toFixed(0)} B`
  }

  if (absBytes < BYTES_PER_MIB) {
    return `${(bytes / BYTES_PER_KIB).toFixed(1)} KiB`
  }

  if (absBytes < BYTES_PER_GIB) {
    return `${(bytes / BYTES_PER_MIB).toFixed(1)} MiB`
  }

  return `${(bytes / BYTES_PER_GIB).toFixed(2)} GiB`
}
