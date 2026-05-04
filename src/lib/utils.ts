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
