/**
 * Optional instrument display fields the backend may add before the generated
 * contracts know about them.
 *
 * Callers strip the fields before strict schema validation and put the valid
 * ones back on the parsed object. Invalid values are discarded so a new field
 * cannot fail an otherwise valid payload.
 */

export interface InstrumentDisplayFields {
  quantityDecimals: number | null
  priceDecimals: number | null
  isDust: boolean | null
}

export interface DisplayFieldBag {
  quantity_decimals?: number
  price_decimals?: number
  is_dust?: boolean
}

const MAX_DECIMAL_PLACES = 20

const EMPTY_DISPLAY: InstrumentDisplayFields = {
  quantityDecimals: null,
  priceDecimals: null,
  isDust: null,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readDecimals = (value: unknown): number | null => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_DECIMAL_PLACES
  ) {
    return null
  }

  return value
}

const readFlag = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null)

const firstDecimal = (record: Record<string, unknown>, keys: readonly string[]): number | null => {
  for (const key of keys) {
    if (!(key in record)) continue
    const digits = readDecimals(record[key])

    if (digits !== null) return digits
  }

  return null
}

const firstFlag = (record: Record<string, unknown>, keys: readonly string[]): boolean | null => {
  for (const key of keys) {
    if (!(key in record)) continue
    const flag = readFlag(record[key])

    if (flag !== null) return flag
  }

  return null
}

export const readDisplayFields = (source: object): InstrumentDisplayFields => {
  if (!isRecord(source)) return EMPTY_DISPLAY

  return {
    quantityDecimals: firstDecimal(source, ['quantityDecimals', 'quantity_decimals']),
    priceDecimals: firstDecimal(source, ['priceDecimals', 'price_decimals']),
    isDust: firstFlag(source, ['isDust', 'is_dust']),
  }
}

export const applyDisplayFields = <T extends object>(entity: T, source: object): T => {
  const display = readDisplayFields(source)

  if (display.quantityDecimals !== null) {
    Object.assign(entity, { quantityDecimals: display.quantityDecimals })
  }

  if (display.priceDecimals !== null) {
    Object.assign(entity, { priceDecimals: display.priceDecimals })
  }

  if (display.isDust !== null) {
    Object.assign(entity, { isDust: display.isDust })
  }

  return entity
}

const bagFromRecord = (record: Record<string, unknown>): DisplayFieldBag | null => {
  const bag: DisplayFieldBag = {}
  let keep = false

  if ('quantity_decimals' in record) {
    const digits = readDecimals(record.quantity_decimals)

    if (digits !== null) {
      bag.quantity_decimals = digits
      keep = true
    }

    delete record.quantity_decimals
  }

  if ('price_decimals' in record) {
    const digits = readDecimals(record.price_decimals)

    if (digits !== null) {
      bag.price_decimals = digits
      keep = true
    }

    delete record.price_decimals
  }

  if ('is_dust' in record) {
    const flag = readFlag(record.is_dust)

    if (flag !== null) {
      bag.is_dust = flag
      keep = true
    }

    delete record.is_dust
  }

  return keep ? bag : null
}

const walkDisplayFields = (
  node: unknown,
  path: string,
  bags: Map<string, DisplayFieldBag>
): void => {
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      walkDisplayFields(item, `${path}/${index}`, bags)
    })

    return
  }

  if (!isRecord(node)) return

  const bag = bagFromRecord(node)

  if (bag !== null) bags.set(path, bag)

  for (const [key, value] of Object.entries(node)) {
    walkDisplayFields(value, `${path}/${key}`, bags)
  }
}

export const detachDisplayFields = (root: unknown): Map<string, DisplayFieldBag> => {
  const bags = new Map<string, DisplayFieldBag>()

  walkDisplayFields(root, '', bags)

  return bags
}

const valueAtPath = (root: unknown, path: string): unknown => {
  if (path === '') return root

  let cursor: unknown = root

  for (const part of path.split('/')) {
    if (part === '') continue

    if (Array.isArray(cursor)) {
      cursor = cursor[Number(part)]
      continue
    }

    if (!isRecord(cursor)) return undefined

    cursor = cursor[part]
  }

  return cursor
}

export const attachDisplayFields = (
  root: unknown,
  bags: ReadonlyMap<string, DisplayFieldBag>
): void => {
  for (const [path, bag] of bags) {
    const target = valueAtPath(root, path)

    if (isRecord(target)) Object.assign(target, bag)
  }
}
