import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { store } from './store'
import type { Phase, Session } from './types'

interface SessionState {
  session: Session | null
  phase: Phase
  /** true once we've resolved the session (or given up) */
  ready: boolean
  /** true when the live backend could not be reached — drives fallback copy */
  backendError: boolean
  kind: 'supabase' | 'local'
  setPhase: (p: Phase) => Promise<void>
}

const Ctx = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [backendError, setBackendError] = useState(false)

  useEffect(() => {
    let alive = true
    store
      .getSession()
      .then((s) => {
        if (!alive) return
        setSession(s)
        setReady(true)
      })
      .catch((err) => {
        console.error('[foss-pulse] could not load session:', err)
        if (!alive) return
        setBackendError(true)
        setReady(true)
      })
    const off = store.onSession((s) => alive && setSession(s))
    return () => {
      alive = false
      off()
    }
  }, [])

  const setPhase = async (p: Phase) => {
    // optimistic — the deck should feel instant even if the write is slow
    setSession((prev) => (prev ? { ...prev, phase: p } : prev))
    try {
      await store.setPhase(p)
    } catch (err) {
      console.error('[foss-pulse] could not set phase:', err)
      setBackendError(true)
    }
  }

  const value: SessionState = {
    session,
    phase: session?.phase ?? 'collect',
    ready,
    backendError,
    kind: store.kind,
    setPhase,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
