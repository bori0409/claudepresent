import { useEffect, useMemo, useRef } from 'react'
import type { AggItem, Axis, Item } from '../lib/types'
import { aggregate, seededShuffle } from '../lib/aggregate'
import './wordcloud.css'

interface Props {
  items: Item[]
  mode: 'cloud' | 'cards'
  axis?: Axis
  /** placeholder words shown when there is nothing yet */
  placeholders?: string[]
}

const DEFAULT_PLACEHOLDERS = ['Makes things up', 'Too wordy', "Confident when it's wrong"]

// per-item font multiplier, capped well under the 5× ceiling (spec §7)
const MIN_MULT = 1.05
const MAX_MULT = 2.5

export default function WordCloud({ items, mode, axis, placeholders }: Props) {
  const agg = useMemo(() => aggregate(items, axis), [items, axis])
  const maxCount = agg.reduce((m, a) => Math.max(m, a.count), 1)

  // stable order: shuffle once by key-set so new arrivals don't re-jumble the field
  const keySig = agg.map((a) => a.key).sort().join('|')
  const ordered = useMemo(
    () => (mode === 'cloud' ? seededShuffle(agg) : agg),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keySig, mode, maxCount],
  )

  // track which keys are new so only they animate in
  const seen = useRef<Set<string>>(new Set())
  useEffect(() => {
    agg.forEach((a) => seen.current.add(a.key))
  }, [agg])

  if (agg.length === 0) {
    const words = placeholders ?? DEFAULT_PLACEHOLDERS
    return (
      <div className={`wc wc--${mode} wc--empty`} aria-hidden="true">
        {words.map((w) => (
          <span key={w} className="wc__word wc__placeholder">
            {w}
          </span>
        ))}
      </div>
    )
  }

  const mult = (a: AggItem) => {
    const frac = maxCount <= 1 ? 0 : (a.count - 1) / (maxCount - 1)
    return MIN_MULT + frac * (MAX_MULT - MIN_MULT)
  }

  return (
    <ul className={`wc wc--${mode}`} aria-label="What the room said">
      {ordered.map((a) => {
        const isNew = !seen.current.has(a.key)
        const cls = [
          'wc__word',
          a.hasFree ? 'wc__word--free' : '',
          isNew ? 'wc__word--enter' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <li
            key={a.key}
            className={cls}
            style={mode === 'cloud' ? { fontSize: `${mult(a).toFixed(3)}em` } : undefined}
          >
            <span className="wc__label">{a.label}</span>
            {a.count > 1 && <span className="wc__count">{a.count}</span>}
          </li>
        )
      })}
    </ul>
  )
}
