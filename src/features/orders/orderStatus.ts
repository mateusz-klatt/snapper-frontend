export const canonicalOrderStatus = (status: string): string => {
  const normalized = status.toLowerCase()

  return normalized === 'canceled' ? 'cancelled' : normalized
}
