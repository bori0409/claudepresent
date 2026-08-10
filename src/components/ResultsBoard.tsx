import { useMemo } from 'react'
import type { Item, Verdict, VerdictRow } from '../lib/types'
import { aggregate } from '../lib/aggregate'
import './resultsboard.css'

interface Props {
  items: Item[]
  verdicts: VerdictRow[]
}

interface Row {
  key: string
  label: string
  answered: number
  partly: number
  not: number
  total: number
}

const ORDER: Verdict[] = ['answered', 'partly', 'not']

export default function ResultsBoard({ items, verdicts }: Props) {
  const rows = useMemo<Row[]>(() => {
    const annoyances = aggregate(items, 'annoy')
    const byItem = new Map<string, { answered: number; partly: number; not: number }>()
    for (const v of verdicts) {
      const r = byItem.get(v.item_id) ?? { answered: 0, partly: 0, not: 0 }
      r[v.verdict] += 1
      byItem.set(v.item_id, r)
    }
    return annoyances
      .map((a) => {
        const c = byItem.get(a.firstId) ?? { answered: 0, partly: 0, not: 0 }
        return {
          key: a.key,
          label: a.label,
          ...c,
          total: c.answered + c.partly + c.not,
        }
      })
      // unresolved rise to the top — this is deliberate (spec §6 slide 10)
      .sort((a, b) => b.not - a.not || b.partly - a.partly || b.total - a.total)
  }, [items, verdicts])

  if (rows.length === 0) {
    return <p className="rb__empty">Nothing to show yet — ratings appear here live.</p>
  }

  return (
    <div className="rb">
      <div className="rb__legend">
        {ORDER.map((v) => (
          <span key={v} className="rb__legenditem">
            <span className={`rb__swatch rb__swatch--${v}`} />
            {v === 'answered' ? 'Answered' : v === 'partly' ? 'Partly' : 'Not really'}
          </span>
        ))}
      </div>

      <ul className="rb__list">
        {rows.map((r) => (
          <li key={r.key} className="rb__row">
            <span className="rb__label">{r.label}</span>
            <span className="rb__bar" role="img"
              aria-label={`${r.label}: ${r.answered} answered, ${r.partly} partly, ${r.not} not really`}>
              {r.total === 0 ? (
                <span className="rb__seg rb__seg--empty" style={{ flex: 1 }} />
              ) : (
                ORDER.map((v) => {
                  const n = r[v]
                  if (n === 0) return null
                  return (
                    <span
                      key={v}
                      className={`rb__seg rb__seg--${v}`}
                      style={{ flexGrow: n }}
                    />
                  )
                })
              )}
            </span>
            <span className="rb__counts">
              {r.answered} / {r.partly} / {r.not}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
