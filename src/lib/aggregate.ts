import type { AggItem, Axis, Item } from './types'

/** Collapse items by trimmed/lowercased label, keeping first-seen casing. */
export function aggregate(items: Item[], axis?: Axis): AggItem[] {
  const map = new Map<string, AggItem>()
  for (const it of items) {
    if (axis && it.axis !== axis) continue
    const key = it.label.trim().toLowerCase()
    if (!key) continue
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      existing.hasFree = existing.hasFree || it.source === 'free'
      existing.ids.push(it.id)
    } else {
      map.set(key, {
        key,
        label: it.label.trim(),
        count: 1,
        axis: it.axis,
        hasFree: it.source === 'free',
        firstId: it.id,
        ids: [it.id],
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/**
 * Deterministic shuffle (mulberry32) so the cloud looks intentional and does not
 * re-jumble on every new arrival. Seeded by a fixed constant.
 */
export function seededShuffle<T>(arr: T[], seed = 0x9e3779b9): T[] {
  let s = seed >>> 0
  const rand = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
