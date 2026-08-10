import { useEffect, useMemo, useState } from 'react'
import { useSession } from '../lib/session-context'
import { useItems, useParticipants, useVerdicts } from '../lib/hooks'
import { store } from '../lib/store'
import { aggregate } from '../lib/aggregate'
import {
  participantId,
  addedChips,
  markChipAdded,
  addedFree,
  markFreeAdded,
  getProfile,
  saveProfile,
} from '../lib/participant'
import { rerollAvatar, type Profile } from '../lib/identity'
import { ANNOY_CHIPS, WORKS_CHIPS } from '../data/seed'
import type { Axis, Participant, Verdict } from '../lib/types'
import './join.css'

const MAX_FREE = 3
const MAX_LEN = 60

export default function Join() {
  const { phase, session, ready } = useSession()
  const sessionId = session?.id ?? null
  const items = useItems(sessionId)
  const participants = useParticipants(sessionId)
  const pid = participantId()

  const [profile, setProfile] = useState<Profile>(getProfile)
  const [done, setDone] = useState(false)

  // Announce/refresh this device's presence whenever identity or done changes.
  useEffect(() => {
    if (!sessionId) return
    store
      .upsertParticipant({
        id: pid,
        session_id: sessionId,
        name: profile.name,
        avatar: profile.avatar,
        done,
      })
      // Presence is best-effort — e.g. if the participants table migration
      // hasn't been run yet. Never let it break the page.
      .catch((err) => console.warn('[foss-pulse] presence upsert failed:', err))
  }, [sessionId, profile.name, profile.avatar, done, pid])

  function updateProfile(p: Profile) {
    setProfile(p)
    saveProfile(p)
  }

  const showIdentity = phase === 'collect' || phase === 'reflect'

  return (
    <JoinShell
      pid={pid}
      others={participants}
      profile={ready && showIdentity ? profile : null}
      onProfile={updateProfile}
    >
      {!ready ? null : (
        <>
          {phase === 'collect' && (
            <Collect
              sessionId={sessionId}
              everyone={items.length}
              done={done}
              onToggleDone={() => setDone((d) => !d)}
            />
          )}
          {phase === 'closed' && <Closed />}
          {phase === 'reflect' && <Reflect sessionId={sessionId} />}
          {phase === 'done' && <Done />}
        </>
      )}
    </JoinShell>
  )
}

function JoinShell({
  children,
  pid,
  others,
  profile,
  onProfile,
}: {
  children: React.ReactNode
  pid: string
  others: Participant[]
  profile: Profile | null
  onProfile: (p: Profile) => void
}) {
  return (
    <div className="join">
      <header className="join__brand">
        <span>FOSS · PULSE</span>
        <Presence pid={pid} others={others} />
      </header>
      <main className="join__body">
        {profile && <IdentityBar pid={pid} profile={profile} onProfile={onProfile} />}
        {children}
      </main>
    </div>
  )
}

// ── Identity: your cute avatar + editable name ───────────────────────────────
function IdentityBar({
  pid,
  profile,
  onProfile,
}: {
  pid: string
  profile: Profile
  onProfile: (p: Profile) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [nonce, setNonce] = useState(1)

  function save() {
    const clean = name.trim().slice(0, 24) || profile.name
    onProfile({ name: clean, avatar: profile.avatar })
    setEditing(false)
  }

  if (!editing) {
    return (
      <button type="button" className="idbar" onClick={() => setEditing(true)}>
        <span className="idbar__avatar" aria-hidden="true">
          {profile.avatar}
        </span>
        <span className="idbar__name">{profile.name}</span>
        <span className="idbar__edit">Change</span>
      </button>
    )
  }

  return (
    <div className="idedit">
      <button
        type="button"
        className="idedit__avatar"
        aria-label="New avatar"
        onClick={() => {
          onProfile({ name, avatar: rerollAvatar(pid, nonce) })
          setNonce((n) => n + 1)
        }}
      >
        {profile.avatar}
        <span className="idedit__reroll">🎲</span>
      </button>
      <input
        className="idedit__input"
        value={name}
        maxLength={24}
        autoFocus
        aria-label="Your name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <button type="button" className="idedit__save" onClick={save}>
        Done
      </button>
    </div>
  )
}

// ── Presence: who else is here ───────────────────────────────────────────────
function Presence({ pid, others }: { pid: string; others: Participant[] }) {
  const roster = others.filter((p) => p.id !== pid)
  if (roster.length === 0) return null
  const shown = roster.slice(0, 5)
  return (
    <span className="presence" title={`${roster.length} others here`}>
      <span className="presence__stack" aria-hidden="true">
        {shown.map((p) => (
          <span key={p.id} className="presence__av">
            {p.avatar}
          </span>
        ))}
      </span>
      <span className="presence__count">{roster.length} here</span>
    </span>
  )
}

// ── Collect ──────────────────────────────────────────────────────────────────
interface Entry {
  label: string
  source: 'chip' | 'free'
}

function Collect({
  sessionId,
  everyone,
  done,
  onToggleDone,
}: {
  sessionId: string | null
  everyone: number
  done: boolean
  onToggleDone: () => void
}) {
  // one merged list of this device's entries per axis, in the order they were added
  const [mine, setMine] = useState<Record<Axis, Entry[]>>(() => ({
    annoy: [
      ...addedFree('annoy').map((label) => ({ label, source: 'free' as const })),
      ...addedChips('annoy').map((label) => ({ label, source: 'chip' as const })),
    ],
    works: [
      ...addedFree('works').map((label) => ({ label, source: 'free' as const })),
      ...addedChips('works').map((label) => ({ label, source: 'chip' as const })),
    ],
  }))

  const myCount = mine.annoy.length + mine.works.length

  function addChip(axis: Axis, label: string) {
    if (!sessionId || mine[axis].some((e) => e.source === 'chip' && e.label === label)) return
    markChipAdded(axis, label)
    setMine((m) => ({ ...m, [axis]: [...m[axis], { label, source: 'chip' }] }))
    void store.addItem(sessionId, { label, source: 'chip', axis })
  }

  function addFree(axis: Axis, label: string) {
    const clean = label.trim().slice(0, MAX_LEN)
    const freeCount = mine[axis].filter((e) => e.source === 'free').length
    if (!sessionId || !clean || freeCount >= MAX_FREE) return
    markFreeAdded(axis, clean)
    setMine((m) => ({ ...m, [axis]: [...m[axis], { label: clean, source: 'free' }] }))
    void store.addItem(sessionId, { label: clean, source: 'free', axis })
  }

  return (
    <>
      <CollectAxis
        axis="annoy"
        heading="What annoys you about working with AI tools?"
        sub="Write your own, one at a time. Stuck? Tap “Not sure?” for ideas."
        placeholder="Type what annoys you…"
        chips={ANNOY_CHIPS}
        entries={mine.annoy}
        onChip={(l) => addChip('annoy', l)}
        onFree={(l) => addFree('annoy', l)}
      />

      <CollectAxis
        axis="works"
        heading="And what already works well?"
        sub="The good bits count too — we build on these."
        placeholder="Type what works for you…"
        chips={WORKS_CHIPS}
        entries={mine.works}
        onChip={(l) => addChip('works', l)}
        onFree={(l) => addFree('works', l)}
        variant="works"
      />

      {myCount > 0 && (
        <p className="join__count" aria-live="polite">
          You've added <strong>{myCount}</strong>. Everyone's added <strong>{everyone}</strong>.
        </p>
      )}

      <button
        type="button"
        className={`donebtn ${done ? 'donebtn--on' : ''}`}
        aria-pressed={done}
        onClick={onToggleDone}
      >
        {done ? "✓ You're done for now" : "I'm done for now"}
      </button>
      <p className="join__hint">
        {done
          ? 'Nice — the room can see you’re ready. You can still add more any time.'
          : 'Keep this open — you can keep adding while we talk.'}
      </p>
    </>
  )
}

function CollectAxis({
  heading,
  sub,
  placeholder,
  chips,
  entries,
  onChip,
  onFree,
  variant,
}: {
  axis: Axis
  heading: string
  sub: string
  placeholder: string
  chips: readonly string[]
  entries: Entry[]
  onChip: (label: string) => void
  onFree: (label: string) => void
  variant?: 'works'
}) {
  const [text, setText] = useState('')
  const [showChips, setShowChips] = useState(false)

  const freeUsed = entries.filter((e) => e.source === 'free').length
  const freeLeft = MAX_FREE - freeUsed
  const canSubmit = text.trim().length > 0 && freeLeft > 0
  const chosenChips = entries.filter((e) => e.source === 'chip').map((e) => e.label)

  const Heading = variant === 'works' ? 'h2' : 'h1'
  return (
    <section className={`axis ${variant === 'works' ? 'axis--works' : ''}`}>
      <Heading className="axis__h">{heading}</Heading>
      <p className="axis__sub">{sub}</p>

      {/* your own entries, accumulating one by one as tags */}
      {entries.length > 0 && (
        <ul className="mine" aria-label="Things you've added">
          {entries.map((e, i) => (
            <li key={`${e.label}-${i}`} className={`minetag minetag--${e.source}`}>
              {e.label}
            </li>
          ))}
        </ul>
      )}

      {/* primary: write your own, one at a time */}
      <form
        className="free"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onFree(text)
          setText('')
        }}
      >
        <div className="free__row">
          <input
            className="free__input"
            type="text"
            inputMode="text"
            maxLength={MAX_LEN}
            value={text}
            placeholder={freeLeft > 0 ? placeholder : 'That’s your three — thanks'}
            disabled={freeLeft <= 0}
            onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            aria-label={`${heading} — add your own (${freeLeft} left)`}
          />
          <button className="free__submit" type="submit" disabled={!canSubmit}>
            Add
          </button>
        </div>
        <div className="free__meta">
          <span>{text.length}/{MAX_LEN}</span>
          <span>{freeLeft} of {MAX_FREE} left</span>
        </div>
      </form>

      {/* fallback: suggestions, hidden until asked for */}
      <button
        type="button"
        className="notsure"
        aria-expanded={showChips}
        onClick={() => setShowChips((s) => !s)}
      >
        {showChips ? 'Hide suggestions' : 'Not sure? Show suggestions'}
      </button>

      {showChips && (
        <div className="chips">
          {chips.map((label) => {
            const on = chosenChips.includes(label)
            return (
              <button
                key={label}
                type="button"
                className={`chip ${on ? 'chip--on' : ''}`}
                aria-pressed={on}
                onClick={() => onChip(label)}
              >
                {label}
                {on && <span className="chip__tick" aria-hidden="true">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Closed ───────────────────────────────────────────────────────────────────
function Closed() {
  return (
    <div className="hold">
      <h1 className="hold__h">Thanks — back to the room.</h1>
      <p className="hold__p">Keep this tab open. We'll come back to it at the end.</p>
    </div>
  )
}

// ── Reflect ──────────────────────────────────────────────────────────────────
function Reflect({ sessionId }: { sessionId: string | null }) {
  const items = useItems(sessionId)
  const verdicts = useVerdicts()
  const pid = participantId()

  // optimistic local overrides so taps feel instant
  const [local, setLocal] = useState<Record<string, Verdict>>({})

  const annoyances = useMemo(() => aggregate(items, 'annoy'), [items])

  const mine = useMemo(() => {
    const map: Record<string, Verdict> = {}
    for (const v of verdicts) if (v.participant_id === pid) map[v.item_id] = v.verdict
    return map
  }, [verdicts, pid])

  const current = (itemId: string): Verdict | undefined => local[itemId] ?? mine[itemId]

  function cast(itemId: string, verdict: Verdict) {
    setLocal((m) => ({ ...m, [itemId]: verdict }))
    void store.castVerdict({ item_id: itemId, participant_id: pid, verdict })
  }

  const rated = annoyances.filter((a) => current(a.firstId)).length
  const total = annoyances.length
  const allDone = total > 0 && rated === total

  const LABELS: { v: Verdict; text: string }[] = [
    { v: 'answered', text: 'Answered' },
    { v: 'partly', text: 'Partly' },
    { v: 'not', text: 'Not really' },
  ]

  return (
    <>
      <h1 className="axis__h">Did we deal with these?</h1>
      <p className="axis__sub">
        The things the room walked in with. Be honest — "not really" is the useful answer.
      </p>

      {total === 0 && <p className="join__hint">Nothing was collected this morning.</p>}

      <ul className="rlist">
        {annoyances.map((a) => {
          const chosen = current(a.firstId)
          return (
            <li key={a.key} className="rrow">
              <div className="rrow__label">
                {a.label}
                {a.count > 1 && <span className="rrow__count">{a.count}</span>}
              </div>
              <div className="rrow__btns" role="group" aria-label={`Rate: ${a.label}`}>
                {LABELS.map(({ v, text }) => (
                  <button
                    key={v}
                    type="button"
                    className={`vbtn vbtn--${v} ${chosen === v ? 'vbtn--on' : ''}`}
                    aria-pressed={chosen === v}
                    onClick={() => cast(a.firstId, v)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      {total > 0 && (
        <div className="rprogress" aria-live="polite">
          {allDone ? "That's all of them. Thank you." : `${rated} of ${total} rated`}
        </div>
      )}
    </>
  )
}

// ── Done ─────────────────────────────────────────────────────────────────────
function Done() {
  return (
    <div className="hold">
      <h1 className="hold__h">Closed.</h1>
      <p className="hold__p">Thanks for taking part.</p>
    </div>
  )
}
