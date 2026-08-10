import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** The public URL the QR code encodes (e.g. https://foss-pulse.netlify.app/join). */
export const JOIN_URL: string =
  (import.meta.env.VITE_JOIN_URL as string | undefined) ||
  (typeof window !== 'undefined' ? `${window.location.origin}/join` : '/join')

/** The single hardcoded session code (spec §2 — no multi-session). */
export const SESSION_CODE = 'FOSS'

/**
 * Supabase is optional at runtime. If env vars are missing (local rehearsal,
 * demo mode, backend down) the client is null and every hook falls back to a
 * local, non-synced experience. A dead backend must never kill the deck.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { realtime: { params: { eventsPerSecond: 5 } } }) : null

export const hasBackend = supabase !== null

/** True when the deck should show seeded demo data (?demo=1). */
export const isDemo =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')
