# FOSS · Pulse — workshop live app

Presentation deck **and** live audience-input surface for the Claude Design workshop.
Vite + React + TS + Tailwind + Supabase. Three moments: **Collect** (annoyances + what works),
the workshop, **Reflect** (did we deal with them?).

- `/` — the presenter deck (projected, keyboard-driven)
- `/join` — the phone page participants scan into (phase-aware, updates itself live)
- `/wall` — optional full-bleed word cloud for a second screen

---

## Run it locally

```bash
npm install
npm run dev
```

Opens on **http://localhost:5186**. Without Supabase keys it runs in **local mode**: state lives in
`localStorage` and syncs across tabs on one machine (great for rehearsal, but phones won't sync to
the projector). The HUD bottom-left shows `○ local` vs `● live`.

Rehearse a full slide 3 / slide 10 without any data by adding `?demo=1`:
**http://localhost:5186/?demo=1** — loads 15 fake items + a spread of ratings.

---

## Before the workshop — 3 steps (~15 min)

### 1. Create the Supabase project + tables

1. Make a new project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql),
   and **Run**. It creates the three tables, RLS policies, realtime, and one `sessions` row
   (`code = 'FOSS'`, `phase = 'collect'`).
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

### 2. Point the app at it

Copy `.env.example` to `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
VITE_JOIN_URL=https://YOUR-SITE.netlify.app/join
```

`VITE_JOIN_URL` is what the QR code encodes — set it to your **deployed** `/join` URL.

### 3. Deploy to Netlify

```bash
npm run build   # sanity check; Netlify runs this for you
```

- New site from this repo (or `netlify deploy --prod`). Build command `npm run build`, publish dir
  `dist` (already in `netlify.toml`, with the SPA redirect so `/join` and `/wall` resolve).
- Add the three `VITE_…` vars in **Site settings → Environment variables**, then redeploy so they
  bake into the build.
- **Test on a phone over mobile data, not office wifi**, before the room fills.

---

## Running the deck (keyboard)

| Key | Action |
|---|---|
| `→` / `Space` | Next slide |
| `←` | Previous slide |
| `f` | Fullscreen |
| `c` | Toggle word cloud ⇄ card wall (slide 3 / `/wall`) |
| `g` then digits then `Enter` | Jump to slide number |
| `p` | Arm phase switch → press `p`/`Enter` to confirm, `Esc` to cancel |

**The phase cycle is `collect → closed → reflect → done`.** Flip it with `p`; open phones update
themselves — nobody re-scans.

- Start on **collect**. Show slide 3 (QR + live cloud) while the room submits.
- Before the hands-on, flip to **closed** (phones show a holding screen).
- At the end, flip to **reflect** and go to slide 10 — the room rates each annoyance and the
  "not really" items rise to the top: that's the takeaway list.

---

## Day-of failure planning (spec §12)

- **Backend down?** Every query is wrapped. The two live slides show a plain "carrying on" message
  and the other 10 slides navigate normally. A dead backend does not kill the presentation.
- **`?demo=1`** rehearses the live slides with fake data.
- **Print the join URL on paper** as well as the QR code.
- **Paper fallback:** index cards for the annoyances. Assume you'll need it; you won't.

---

## Notes

- No auth, no accounts, one hardcoded session (`FOSS`). 12-person internal workshop on an unlisted
  URL — RLS policies are deliberately permissive (spec §3).
- Design tokens live in one `:root` block in `src/index.css`. `--accent` is imperial-red; change it
  there and everything re-themes.
- Lexend is self-hosted in `public/fonts/` so a projected slide never blocks on a font request.
- Nothing identifying is stored. `participant_id` (a random uuid in `localStorage`) exists only to
  stop one person rating the same item twice.
