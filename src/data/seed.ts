import type { AggItem, Item, VerdictRow } from '../lib/types'

/** The 12 real complaints — keep this wording exactly (spec §5). */
export const ANNOY_CHIPS = [
  'Makes things up',
  'Too wordy',
  'Sounds like AI wrote it',
  'Forgets what I told it',
  'Wrong brand colours',
  "Confident when it's wrong",
  'Can’t make the one small tweak I want',
  'Output looks templated',
  "Doesn't know our product",
  'Ignores half my instructions',
  "Gives me options I didn't ask for",
  'Slow to get to something usable',
] as const

/** Positive counterpart chips (the screenshot's "Works well" axis). */
export const WORKS_CHIPS = [
  'Fast first drafts to react to',
  'Unblocks the blank page',
  'Boring copy in seconds',
  'Summarises long feedback',
  'Good moodboard starting points',
  'Cleans up transcripts and notes',
] as const

let demoSeq = 0
function fakeItem(label: string, axis: 'annoy' | 'works', source: 'chip' | 'free'): Item {
  demoSeq += 1
  return {
    id: `demo-${demoSeq}`,
    session_id: 'demo',
    label,
    source,
    axis,
    // deterministic timestamps so demo mode is stable across renders
    created_at: new Date(2026, 7, 11, 9, 0, demoSeq).toISOString(),
  }
}

/**
 * 15 fake items for ?demo=1 (spec §12), with a couple of chips repeated to give
 * the cloud real weight and two hand-typed ones so the free-text treatment shows.
 */
export function demoItems(): Item[] {
  demoSeq = 0
  return [
    fakeItem('Makes things up', 'annoy', 'chip'),
    fakeItem('Makes things up', 'annoy', 'chip'),
    fakeItem('Makes things up', 'annoy', 'chip'),
    fakeItem("Confident when it's wrong", 'annoy', 'chip'),
    fakeItem("Confident when it's wrong", 'annoy', 'chip'),
    fakeItem("Doesn't know our product", 'annoy', 'chip'),
    fakeItem("Doesn't know our product", 'annoy', 'chip'),
    fakeItem('Ignores half my instructions', 'annoy', 'chip'),
    fakeItem('Too wordy', 'annoy', 'chip'),
    fakeItem('Wrong brand colours', 'annoy', 'chip'),
    fakeItem('It buries the one number I needed', 'annoy', 'free'),
    fakeItem('Writing the prompt takes longer than the task', 'annoy', 'free'),
    fakeItem('Fast first drafts to react to', 'works', 'chip'),
    fakeItem('Fast first drafts to react to', 'works', 'chip'),
    fakeItem('Unblocks the blank page', 'works', 'free'),
  ]
}

/**
 * Synthetic verdicts for ?demo=1 so slide 10 (the results board) rehearses with
 * a realistic spread. Keyed to each annoyance's representative id so it lines up
 * with whatever aggregate() produces from demoItems().
 */
export function demoVerdicts(annoyances: AggItem[]): VerdictRow[] {
  // (answered, partly, not) per item — enough variety that sorting is visible
  const spreads = [
    [5, 4, 2],
    [8, 2, 1],
    [3, 6, 2],
    [9, 2, 0],
    [2, 4, 4],
    [1, 3, 6],
    [4, 5, 2],
    [7, 5, 1],
    [2, 3, 5],
  ]
  const rows: VerdictRow[] = []
  let seq = 0
  annoyances.forEach((a, i) => {
    const [ans, par, not] = spreads[i % spreads.length]
    const push = (n: number, verdict: 'answered' | 'partly' | 'not') => {
      for (let k = 0; k < n; k++) {
        seq += 1
        rows.push({
          id: `dv-${seq}`,
          item_id: a.firstId,
          participant_id: `demoP-${seq}`,
          verdict,
          created_at: new Date(2026, 7, 11, 11, 30, seq).toISOString(),
        })
      }
    }
    push(ans, 'answered')
    push(par, 'partly')
    push(not, 'not')
  })
  return rows
}
