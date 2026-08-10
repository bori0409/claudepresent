import { supabase, hasBackend, SESSION_CODE, isDemo } from './supabase'
import type { Item, Phase, Session, VerdictRow, Axis, Source, Verdict } from './types'
import { demoItems } from '../data/seed'

/**
 * One storage interface, two implementations:
 *  - SupabaseStore: real Postgres + Realtime (used when env keys are present)
 *  - LocalStore:    localStorage + BroadcastChannel, syncs across tabs on one
 *                   machine. Keeps the whole app demonstrable with the backend
 *                   down or absent (spec §12), and lets the two-window realtime
 *                   test (spec §10.3) run without credentials.
 */
export interface Store {
  readonly kind: 'supabase' | 'local'
  getSession(): Promise<Session>
  onSession(cb: (s: Session) => void): () => void
  setPhase(phase: Phase): Promise<void>

  listItems(sessionId: string): Promise<Item[]>
  onItems(sessionId: string, cb: () => void): () => void
  addItem(sessionId: string, input: { label: string; source: Source; axis: Axis }): Promise<void>

  listVerdicts(): Promise<VerdictRow[]>
  onVerdicts(cb: () => void): () => void
  castVerdict(input: { item_id: string; participant_id: string; verdict: Verdict }): Promise<void>
}

// ── Supabase-backed store ────────────────────────────────────────────────────
class SupabaseStore implements Store {
  readonly kind = 'supabase' as const

  async getSession(): Promise<Session> {
    const { data, error } = await supabase!
      .from('sessions')
      .select('*')
      .eq('code', SESSION_CODE)
      .single()
    if (error || !data) throw error ?? new Error('session not found')
    return data as Session
  }

  onSession(cb: (s: Session) => void) {
    const ch = supabase!
      .channel('sessions')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions' },
        (p) => cb(p.new as Session),
      )
      .subscribe()
    return () => void supabase!.removeChannel(ch)
  }

  async setPhase(phase: Phase) {
    const { error } = await supabase!.from('sessions').update({ phase }).eq('code', SESSION_CODE)
    if (error) throw error
  }

  async listItems(sessionId: string): Promise<Item[]> {
    const { data, error } = await supabase!
      .from('items')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as Item[]
  }

  onItems(sessionId: string, cb: () => void) {
    const ch = supabase!
      .channel('items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `session_id=eq.${sessionId}` },
        () => cb(),
      )
      .subscribe()
    return () => void supabase!.removeChannel(ch)
  }

  async addItem(sessionId: string, input: { label: string; source: Source; axis: Axis }) {
    const { error } = await supabase!.from('items').insert({ session_id: sessionId, ...input })
    if (error) throw error
  }

  async listVerdicts(): Promise<VerdictRow[]> {
    const { data, error } = await supabase!.from('verdicts').select('*')
    if (error) throw error
    return (data ?? []) as VerdictRow[]
  }

  onVerdicts(cb: () => void) {
    const ch = supabase!
      .channel('verdicts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verdicts' }, () => cb())
      .subscribe()
    return () => void supabase!.removeChannel(ch)
  }

  async castVerdict(input: { item_id: string; participant_id: string; verdict: Verdict }) {
    const { error } = await supabase!
      .from('verdicts')
      .upsert(input, { onConflict: 'item_id,participant_id' })
    if (error) throw error
  }
}

// ── Local store (localStorage + BroadcastChannel) ────────────────────────────
const LS = {
  session: 'foss-pulse:local:session',
  items: 'foss-pulse:local:items',
  verdicts: 'foss-pulse:local:verdicts',
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function lsSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

// Monotonic-ish id without Date.now()/Math.random() reliance for stability.
let localSeq = 0
function localId(prefix: string) {
  localSeq += 1
  const n = lsGet<number>('foss-pulse:local:seq', 0) + 1
  lsSet('foss-pulse:local:seq', n)
  return `${prefix}-${n}-${localSeq}`
}

class LocalStore implements Store {
  readonly kind = 'local' as const
  private bus =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('foss-pulse') : null

  constructor() {
    // Seed the local store once.
    if (!localStorage.getItem(LS.session)) {
      const now = new Date(2026, 7, 11, 9, 0, 0).toISOString()
      const seed: Session = {
        id: 'local',
        code: SESSION_CODE,
        phase: 'collect',
        created_at: now,
      }
      lsSet(LS.session, seed)
    }
    if (isDemo && lsGet<Item[]>(LS.items, []).length === 0) {
      lsSet(LS.items, demoItems())
    }
  }

  private emit(topic: 'session' | 'items' | 'verdicts') {
    this.bus?.postMessage(topic)
  }

  private listen(topic: 'session' | 'items' | 'verdicts', cb: (raw?: unknown) => void) {
    const onBus = (e: MessageEvent) => {
      if (e.data === topic) cb()
    }
    // 'storage' fires in *other* tabs; BroadcastChannel covers same+other tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key === (LS as Record<string, string>)[topic]) cb()
    }
    this.bus?.addEventListener('message', onBus)
    window.addEventListener('storage', onStorage)
    return () => {
      this.bus?.removeEventListener('message', onBus)
      window.removeEventListener('storage', onStorage)
    }
  }

  async getSession(): Promise<Session> {
    return lsGet<Session>(LS.session, {
      id: 'local',
      code: SESSION_CODE,
      phase: 'collect',
      created_at: new Date(2026, 7, 11, 9, 0, 0).toISOString(),
    })
  }

  onSession(cb: (s: Session) => void) {
    return this.listen('session', () => void this.getSession().then(cb))
  }

  async setPhase(phase: Phase) {
    const s = await this.getSession()
    lsSet(LS.session, { ...s, phase })
    this.emit('session')
  }

  async listItems(): Promise<Item[]> {
    return lsGet<Item[]>(LS.items, [])
  }

  onItems(_sessionId: string, cb: () => void) {
    return this.listen('items', cb)
  }

  async addItem(sessionId: string, input: { label: string; source: Source; axis: Axis }) {
    const items = lsGet<Item[]>(LS.items, [])
    const now = new Date(2026, 7, 11, 9, 0, items.length + 1).toISOString()
    items.push({ id: localId('item'), session_id: sessionId, created_at: now, ...input })
    lsSet(LS.items, items)
    this.emit('items')
  }

  async listVerdicts(): Promise<VerdictRow[]> {
    return lsGet<VerdictRow[]>(LS.verdicts, [])
  }

  onVerdicts(cb: () => void) {
    return this.listen('verdicts', cb)
  }

  async castVerdict(input: { item_id: string; participant_id: string; verdict: Verdict }) {
    const rows = lsGet<VerdictRow[]>(LS.verdicts, [])
    const idx = rows.findIndex(
      (r) => r.item_id === input.item_id && r.participant_id === input.participant_id,
    )
    const now = new Date(2026, 7, 11, 11, 0, rows.length + 1).toISOString()
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], verdict: input.verdict }
    } else {
      rows.push({ id: localId('verdict'), created_at: now, ...input })
    }
    lsSet(LS.verdicts, rows)
    this.emit('verdicts')
  }
}

export const store: Store = hasBackend ? new SupabaseStore() : new LocalStore()
export const storeKind = store.kind
