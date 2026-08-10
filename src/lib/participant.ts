import { profileFromSeed, type Profile } from './identity'

const PID_KEY = 'foss-pulse:pid'
const PROFILE_KEY = 'foss-pulse:profile'

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

/** This device's profile (cute name + avatar), generated once, then editable. */
export function getProfile(): Profile {
  if (typeof window === 'undefined') return { name: 'Someone', avatar: '🙂' }
  const raw = localStorage.getItem(PROFILE_KEY)
  if (raw) {
    try {
      const p = JSON.parse(raw) as Profile
      if (p?.name && p?.avatar) return p
    } catch {
      /* fall through to regenerate */
    }
  }
  const fresh = profileFromSeed(participantId())
  localStorage.setItem(PROFILE_KEY, JSON.stringify(fresh))
  return fresh
}

export function saveProfile(profile: Profile) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
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

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : []
}

export function addedChips(axis: AxisKey): string[] {
  return asArray(read<Record<AxisKey, unknown>>(CHIP_KEY, { annoy: [], works: [] })[axis])
}

export function markChipAdded(axis: AxisKey, label: string) {
  const all = read<Record<AxisKey, string[]>>(CHIP_KEY, { annoy: [], works: [] })
  const list = all[axis] ?? []
  if (!list.includes(label)) all[axis] = [...list, label]
  write(CHIP_KEY, all)
}

export function addedFree(axis: AxisKey): string[] {
  return asArray(read<Record<AxisKey, unknown>>(FREE_KEY, { annoy: [], works: [] })[axis])
}

export function markFreeAdded(axis: AxisKey, label: string) {
  const all = { annoy: addedFree('annoy'), works: addedFree('works') }
  all[axis] = [...all[axis], label]
  write(FREE_KEY, all)
}
