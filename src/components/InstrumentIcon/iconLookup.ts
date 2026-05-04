/**
 * Vendored-icon manifest lookup utilities.
 *
 * Co-located with `RemoteSvg.tsx` but kept in a non-component module so
 * `react-refresh` can fast-refresh the component without invalidating
 * these constants/helpers on every edit.
 */
import { VENDORED_CRYPTO_ICONS, VENDORED_FLAG_ICONS } from './iconManifest.generated'

export const CIRCLE_FLAGS_CDN = '/icons/flags'
export const CRYPTO_ICONS_CDN = '/icons/crypto'

type IconKind = 'crypto' | 'flag'

export function isVendored(kind: IconKind, key: string): boolean {
  if (kind === 'crypto') {
    return VENDORED_CRYPTO_ICONS.has(key.toLowerCase())
  }

  return VENDORED_FLAG_ICONS.has(key.toLowerCase())
}
