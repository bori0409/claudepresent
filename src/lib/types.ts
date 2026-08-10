export type Phase = 'collect' | 'closed' | 'reflect' | 'done'
export type Axis = 'annoy' | 'works'
export type Source = 'chip' | 'free'
export type Verdict = 'answered' | 'partly' | 'not'

export interface Session {
  id: string
  code: string
  phase: Phase
  created_at: string
}

export interface Item {
  id: string
  session_id: string
  label: string
  source: Source
  axis: Axis
  created_at: string
}

export interface VerdictRow {
  id: string
  item_id: string
  participant_id: string
  verdict: Verdict
  created_at: string
}

export interface Participant {
  id: string
  session_id: string
  name: string
  avatar: string // emoji
  done: boolean
  updated_at: string
}

/** An item collapsed by label, with its occurrence count. */
export interface AggItem {
  key: string // lowercased trimmed label
  label: string // first-seen casing
  count: number
  axis: Axis
  hasFree: boolean // any of the merged rows was hand-typed
  firstId: string // a representative item id (used for verdict rows)
  ids: string[] // all underlying item ids sharing this label
}
