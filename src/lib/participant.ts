const PID_KEY = 'foss-pulse:pid'

/** Stable per-device id, used only to stop one person voting twice. */
export function participantId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let pid = localStorage.getItem(PID_KEY)
  if (!pid) {
    pid = crypto.randomUUID()
    localStorage.setItem(PID_KEY, pid)
  }
  return pid
}

// ── Local guards (spec §5): remember what this device already added, so we can
//    stop double chip-votes and cap free-text at 3 without a round-trip. ──────
const CHIP_KEY = 'foss-pulse:chips' // labels this device has added, per axis
const FREE_KEY = 'foss-pulse:free' // count of free-text submissions, per axis

type AxisKey = 'annoy' | 'works'

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export function addedChips(axis: AxisKey): string[] {
  return read<Record<AxisKey, string[]>>(CHIP_KEY, { annoy: [], works: [] })[axis] ?? []
}

export function markChipAdded(axis: AxisKey, label: string) {
  const all = read<Record<AxisKey, string[]>>(CHIP_KEY, { annoy: [], works: [] })
  const list = all[axis] ?? []
  if (!list.includes(label)) all[axis] = [...list, label]
  write(CHIP_KEY, all)
}

export function freeCount(axis: AxisKey): number {
  return read<Record<AxisKey, number>>(FREE_KEY, { annoy: 0, works: 0 })[axis] ?? 0
}

export function bumpFreeCount(axis: AxisKey) {
  const all = read<Record<AxisKey, number>>(FREE_KEY, { annoy: 0, works: 0 })
  all[axis] = (all[axis] ?? 0) + 1
  write(FREE_KEY, all)
}
