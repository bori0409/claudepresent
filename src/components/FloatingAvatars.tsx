import { useEffect, useRef, useState } from 'react'
import type { Participant } from '../lib/types'
import './floating.css'

// Small deterministic hash → 0..1, so each token gets a stable position/speed.
function h(s: string): number {
  let x = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619)
  }
  return (x >>> 0) / 4294967296
}

interface Token {
  key: string
  id: string
  avatar: string
}

export default function FloatingAvatars({ participants }: { participants: Participant[] }) {
  // a few copies each, thinning out as the room fills so it never overcrowds
  const copies = participants.length <= 6 ? 3 : participants.length <= 12 ? 2 : 1
  const tokens: Token[] = participants.flatMap((p) =>
    Array.from({ length: copies }, (_, i) => ({ key: `${p.id}#${i}`, id: p.id, avatar: p.avatar })),
  )

  // hop the avatars of whoever just did something (their updated_at changed)
  const lastSeen = useRef<Map<string, string>>(new Map())
  const [hopping, setHopping] = useState<Set<string>>(new Set())

  useEffect(() => {
    const changed: string[] = []
    for (const p of participants) {
      const prev = lastSeen.current.get(p.id)
      if (prev !== undefined && prev !== p.updated_at) changed.push(p.id)
      lastSeen.current.set(p.id, p.updated_at)
    }
    if (changed.length === 0) return
    setHopping((s) => new Set([...s, ...changed]))
    const t = window.setTimeout(() => {
      setHopping((s) => {
        const n = new Set(s)
        changed.forEach((id) => n.delete(id))
        return n
      })
    }, 720)
    return () => window.clearTimeout(t)
  }, [participants])

  if (tokens.length === 0) return null

  return (
    <div className="floaters" aria-hidden="true">
      {tokens.map((t) => {
        const left = 3 + h(t.key + 'x') * 94 // %
        const bottom = 8 + h(t.key + 'b') * 55 // %
        const dur = 3.4 + h(t.key + 'd') * 3.2 // s
        const delay = -h(t.key + 'y') * 6 // s (negative desyncs)
        const drift = (h(t.key + 's') - 0.5) * 26 // px sway
        return (
          <span
            key={t.key}
            className="floater"
            style={
              {
                left: `${left}%`,
                bottom: `${bottom}%`,
                '--dur': `${dur}s`,
                '--delay': `${delay}s`,
                '--drift': `${drift}px`,
              } as React.CSSProperties
            }
          >
            <span className={`floater__inner ${hopping.has(t.id) ? 'floater__inner--hop' : ''}`}>
              {t.avatar}
            </span>
          </span>
        )
      })}
    </div>
  )
}
