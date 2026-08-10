import { useEffect, useState } from 'react'
import { useSession } from '../lib/session-context'
import { useItems } from '../lib/hooks'
import { isDemo } from '../lib/supabase'
import { demoItems } from '../data/seed'
import { aggregate } from '../lib/aggregate'
import WordCloud from '../components/WordCloud'
import './wall.css'

/** Full-bleed word cloud for a second screen. Press `c` to toggle card wall. */
export default function Wall() {
  const { session } = useSession()
  const liveItems = useItems(session?.id ?? null)
  const items = isDemo ? demoItems() : liveItems
  const [mode, setMode] = useState<'cloud' | 'cards'>('cloud')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'c') setMode((m) => (m === 'cloud' ? 'cards' : 'cloud'))
      if (e.key === 'f') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const total = items.length
  const distinct = aggregate(items, 'annoy').length

  return (
    <div className="wall">
      <WordCloud items={items} mode={mode} axis="annoy" />
      {total > 0 && (
        <div className="wall__count">
          {total} so far · {distinct} distinct
        </div>
      )}
    </div>
  )
}
