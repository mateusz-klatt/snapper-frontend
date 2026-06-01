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

const BYTES_PER_MIB = 1024 * 1024
const MIB_PER_GIB = 1024

/**
 * Render a byte count as a binary-base human string.
 *
 * Below one gibibyte the value is shown in mebibytes with one decimal
 * (`<n>.<1> MiB`); at or above 1024 MiB it switches to gibibytes with
 * two decimals (`<n>.<2> GiB`). Pure and i18n-free so callers can wrap
 * it in their own translation layer.
 */
export function formatBytes(bytes: number): string {
  const mib = bytes / BYTES_PER_MIB

  if (mib < MIB_PER_GIB) {
    return `${mib.toFixed(1)} MiB`
  }

  return `${(mib / MIB_PER_GIB).toFixed(2)} GiB`
}
