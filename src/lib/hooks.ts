import { useEffect, useState } from 'react'
import { store } from './store'
import type { Item, Participant, VerdictRow } from './types'

/** Live list of items for the session (empty until sessionId resolves). */
export function useItems(sessionId: string | null): Item[] {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    if (!sessionId) return
    let alive = true
    const refresh = () =>
      store
        .listItems(sessionId)
        .then((rows) => alive && setItems(rows))
        .catch((err) => console.error('[foss-pulse] items load failed:', err))
    refresh()
    const off = store.onItems(sessionId, refresh)
    return () => {
      alive = false
      off()
    }
  }, [sessionId])

  return items
}

/** Live list of all verdict rows (small workshop — no scoping needed). */
export function useVerdicts(enabled = true): VerdictRow[] {
  const [rows, setRows] = useState<VerdictRow[]>([])

  useEffect(() => {
    if (!enabled) return
    let alive = true
    const refresh = () =>
      store
        .listVerdicts()
        .then((r) => alive && setRows(r))
        .catch((err) => console.error('[foss-pulse] verdicts load failed:', err))
    refresh()
    const off = store.onVerdicts(refresh)
    return () => {
      alive = false
      off()
    }
  }, [enabled])

  return rows
}

/** Live roster of everyone who has joined this session. */
export function useParticipants(sessionId: string | null): Participant[] {
  const [rows, setRows] = useState<Participant[]>([])

  useEffect(() => {
    if (!sessionId) return
    let alive = true
    const refresh = () =>
      store
        .listParticipants(sessionId)
        .then((r) => alive && setRows(r))
        .catch((err) => console.error('[foss-pulse] participants load failed:', err))
    refresh()
    const off = store.onParticipants(sessionId, refresh)
    return () => {
      alive = false
      off()
    }
  }, [sessionId])

  return rows
}
