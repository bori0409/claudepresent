import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '../lib/session-context'
import { useItems, useVerdicts } from '../lib/hooks'
import { aggregate } from '../lib/aggregate'
import { JOIN_URL, isDemo } from '../lib/supabase'
import { demoItems, demoVerdicts } from '../data/seed'
import type { Phase } from '../lib/types'
import WordCloud from '../components/WordCloud'
import ResultsBoard from '../components/ResultsBoard'
import QR from '../components/QR'
import { Brief } from './Brief'
import './deck.css'

const PHASE_ORDER: Phase[] = ['collect', 'closed', 'reflect', 'done']
const PHASE_LABEL: Record<Phase, string> = {
  collect: 'Collect',
  closed: 'Closed (holding)',
  reflect: 'Reflect',
  done: 'Done',
}
function nextPhase(p: Phase): Phase {
  return PHASE_ORDER[(PHASE_ORDER.indexOf(p) + 1) % PHASE_ORDER.length]
}

export default function Deck() {
  const { phase, session, setPhase, backendError, kind } = useSession()
  const sessionId = session?.id ?? null

  // Live data (demo mode overlays fixed seed data regardless of backend).
  const liveItems = useItems(sessionId)
  const liveVerdicts = useVerdicts()
  const dItems = useMemo(() => (isDemo ? demoItems() : []), [])
  const items = isDemo ? dItems : liveItems
  const dVerdicts = useMemo(
    () => (isDemo ? demoVerdicts(aggregate(dItems, 'annoy')) : []),
    [dItems],
  )
  const verdicts = isDemo ? dVerdicts : liveVerdicts

  const [index, setIndex] = useState(0)
  const [cloudMode, setCloudMode] = useState<'cloud' | 'cards'>('cloud')
  const [armed, setArmed] = useState<Phase | null>(null) // phase switch awaiting confirm
  const [goto, setGoto] = useState<string | null>(null) // digit buffer
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const slides = useMemo(
    () =>
      buildSlides({ items, verdicts, cloudMode, phase, backendError }),
    [items, verdicts, cloudMode, phase, backendError],
  )
  const N = slides.length

  const flashToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(N - 1, i))), [N])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }, [])

  const confirmPhase = useCallback(
    (p: Phase) => {
      void setPhase(p)
      setArmed(null)
      flashToast(`Phase → ${PHASE_LABEL[p]}`)
    },
    [setPhase, flashToast],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // don't hijack typing in inputs (the deck has none, but be safe)
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return

      // goto-buffer mode
      if (goto !== null) {
        if (e.key >= '0' && e.key <= '9') {
          setGoto((g) => (g ?? '') + e.key)
          e.preventDefault()
          return
        }
        if (e.key === 'Enter') {
          const n = parseInt(goto || '0', 10)
          if (n >= 1 && n <= N) go(n - 1)
          setGoto(null)
          e.preventDefault()
          return
        }
        if (e.key === 'Escape') {
          setGoto(null)
          e.preventDefault()
          return
        }
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          go(index + 1)
          e.preventDefault()
          break
        case 'ArrowLeft':
        case 'PageUp':
          go(index - 1)
          e.preventDefault()
          break
        case 'f':
          toggleFullscreen()
          break
        case 'c':
          setCloudMode((m) => (m === 'cloud' ? 'cards' : 'cloud'))
          flashToast(cloudMode === 'cloud' ? 'Card wall' : 'Word cloud')
          break
        case 'g':
          setGoto('')
          break
        case 'p':
          if (armed) confirmPhase(armed)
          else setArmed(nextPhase(phase)) // persistent prompt renders from `armed`
          e.preventDefault()
          break
        case 'Enter':
          if (armed) {
            confirmPhase(armed)
            e.preventDefault()
          }
          break
        case 'Escape':
          if (armed) {
            setArmed(null)
            setToast(null)
            e.preventDefault()
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, N, goto, armed, phase, cloudMode, go, toggleFullscreen, confirmPhase, flashToast])

  return (
    <div className="deck">
      <div className="deck__stage" key={index}>
        {slides[index]}
      </div>

      {/* presenter HUD — low-contrast, visible to presenter, invisible to the room */}
      <div className="deck__progress" style={{ width: `${((index + 1) / N) * 100}%` }} />
      <div className="deck__num">
        {index + 1} / {N}
      </div>
      <div className="deck__phase">
        {kind === 'local' ? '○ local' : '● live'} · {PHASE_LABEL[phase]}
      </div>

      {goto !== null && <div className="deck__goto">go to slide: {goto || '…'}</div>}
      {armed ? (
        <div className="deck__toast deck__toast--armed">
          Switch to <b>{PHASE_LABEL[armed]}</b>? &nbsp;<b>p</b> or <b>Enter</b> to confirm ·{' '}
          <b>Esc</b> to cancel
        </div>
      ) : (
        toast && <div className="deck__toast">{toast}</div>
      )}
    </div>
  )
}

// ── Slide construction ───────────────────────────────────────────────────────
function buildSlides(ctx: {
  items: ReturnType<typeof useItems>
  verdicts: ReturnType<typeof useVerdicts>
  cloudMode: 'cloud' | 'cards'
  phase: Phase
  backendError: boolean
}) {
  const { items, verdicts, cloudMode, backendError } = ctx
  const total = items.length
  const distinct = aggregate(items, 'annoy').length
  const works = aggregate(items, 'works').slice(0, 6)

  return [
    // 1 — Title
    <Slide key="s1" center>
      <p className="eyebrow">FOSS marketing + design · 11 August</p>
      <h1 className="title">Claude Design workshop</h1>
      <p className="lede">Less presentation, more messing around with it together</p>
    </Slide>,

    // 2 — Why you're here
    <Slide key="s2">
      <h2 className="h">Why you're here</h2>
      <p className="body">
        You may have accepted something called “New Event”. Bold of you.
      </p>
      <p className="body">
        Today: I show you how I actually use it, we all take the same real brief, then we compare
        what came out. <em>The comparing is the good bit.</em>
      </p>
    </Slide>,

    // 3 — LIVE: the annoyances
    <Slide key="s3" live>
      <div className="live3">
        <div className="live3__join">
          <p className="kicker">Scan to join · 60 seconds · anonymous</p>
          <QR value={JOIN_URL} size={320} />
          <p className="live3__url">{prettyUrl(JOIN_URL)}</p>
        </div>
        <div className="live3__cloud">
          <h2 className="h h--tight">What annoys you about working with AI tools?</h2>
          <div className="live3__cloudarea">
            {backendError ? (
              <p className="live-note">
                Live view unavailable — carrying on. (Ask the room out loud.)
              </p>
            ) : (
              <WordCloud items={items} mode={cloudMode} axis="annoy" />
            )}
          </div>
          <p className="live3__count">
            {total > 0 ? (
              <>
                <strong>{total}</strong> so far · {distinct} distinct
              </>
            ) : (
              'Waiting for the room…'
            )}
          </p>
          {works.length > 0 && (
            <div className="live3__works">
              <span className="live3__workslabel">Also working well</span>
              {works.map((w) => (
                <span key={w.key} className="live3__workschip">
                  {w.label}
                  {w.count > 1 && <b> {w.count}</b>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Slide>,

    // 4 — Round: what have you tried
    <Slide key="s4">
      <h2 className="h">What did you try · what worked · what annoyed you</h2>
      <p className="small">Two answers each. I'm writing them down.</p>
    </Slide>,

    // 5 — How I use it
    <Slide key="s5">
      <h2 className="h">A real brief: the Supplier Portal</h2>
      <p className="body">
        The problem: the suppliers of our customers don't know this exists, and don't know it's
        free for them.
      </p>
    </Slide>,

    // 6 — Who you're actually writing to
    <Slide key="s6">
      <h2 className="h">Not our customer. Our customer's supplier.</h2>
      <p className="body">
        They didn't ask for this. They assume it will cost them money. They have no relationship
        with FOSS.
      </p>
    </Slide>,

    // 7 — Where it goes wrong (credibility slide, visually distinct)
    <Slide key="s7" tone="warn">
      <p className="kicker kicker--warn">Where it goes wrong</p>
      <h2 className="h">
        It will write “our support team is here to help” for a support path that may not exist.
      </h2>
      <p className="body">
        Not a bad sentence. A <em>confidently wrong</em> one. Only someone who knows the org
        catches it.
      </p>
    </Slide>,

    // 8 — Your turn (+ full brief)
    <Slide key="s8">
      <h2 className="h h--tight">Your turn</h2>
      <p className="small">
        Same brief. Half of you cold, half of you inside the project. Pick a format: one-pager ·
        web section · social post aimed at customers.
      </p>
      <Brief />
    </Slide>,

    // 9 — Share-back
    <Slide key="s9">
      <h2 className="h">What surprised you · what fell flat · what did you have to fight it on</h2>
      <p className="small">Cold group first.</p>
    </Slide>,

    // 10 — LIVE: did we deal with these
    <Slide key="s10" live>
      <div className="results">
        <h2 className="h h--tight">What we're taking away</h2>
        <p className="small">
          The things the room walked in with. What comes back “not really” is the to-do list — not
          a score.
        </p>
        {backendError ? (
          <p className="live-note">Live view unavailable — read the room instead.</p>
        ) : (
          <ResultsBoard items={items} verdicts={verdicts} />
        )}
      </div>
    </Slide>,

    // 11 — What this changes for us
    <Slide key="s11">
      <h2 className="h h--tight">What this changes for us</h2>
      <ul className="qlist">
        <li>What can go out without human review?</li>
        <li>Who signs off a commercial claim like “free for suppliers”?</li>
        <li>Where does our brand and tone live, so nobody starts from a blank prompt again?</li>
        <li>What are we not putting into a chat?</li>
      </ul>
    </Slide>,

    // 12 — One next step
    <Slide key="s12" center>
      <p className="kicker">One next step</p>
      <h2 className="h">The Supplier Portal assets get finished and published.</h2>
      <p className="body">
        Then we read portal adoption in the SQ dashboard and see if it moved.
      </p>
    </Slide>,
  ]
}

function Slide({
  children,
  center,
  live,
  tone,
}: {
  children: React.ReactNode
  center?: boolean
  live?: boolean
  tone?: 'warn'
}) {
  const cls = [
    'slide',
    center ? 'slide--center' : '',
    live ? 'slide--live' : '',
    tone === 'warn' ? 'slide--warn' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return <section className={cls}>{children}</section>
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url)
    return (u.host + u.pathname).replace(/\/$/, '')
  } catch {
    return url
  }
}
