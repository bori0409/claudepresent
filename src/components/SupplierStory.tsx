import { useEffect, useRef } from 'react'
import './supplierstory.css'

export const SUPPLIER_STAGES = 5

const CAPS = [
  'Our customer buys Supplier Quality. So far, so ordinary.',
  'The <b>Supplier Portal</b> comes with it — and it costs their suppliers nothing.',
  "Here's the turn: <b>it isn't for the customer at all.</b> It's for the people on the right, who've never heard of us.",
  'But the customer has nothing to send. And the supplier assumes it will cost them.',
  '<b>So the loop never closes.</b> The licence is paid; the value just sits there. That’s what we’re making material for today.',
]

// Polished, on-brand rebuild of the wireframe diagram. Groups carry data-from so
// the parent [data-stage] reveals them cumulatively (see supplierstory.css).
const SVG = `
<svg viewBox="0 0 1200 430" xmlns="http://www.w3.org/2000/svg" role="img"
  aria-label="FOSS IQX Supplier Quality includes the Supplier Portal. The customer holds the licence, but the portal is for their suppliers, and the invitation path is broken.">
  <defs>
    <filter id="ss-shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="#0b2e38" flood-opacity="0.10"/>
    </filter>
    <marker id="ss-ar" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M1,1 L10,6 L1,11" fill="none" stroke="var(--fg-faint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
    <marker id="ss-arA" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse">
      <path d="M1,1 L10,6 L1,11" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- STAGE 1 · the product + the customer + the paid licence -->
  <g class="st" data-from="1">
    <rect x="40" y="58" width="336" height="332" rx="18" fill="var(--bg-elevated)" stroke="var(--outline)" filter="url(#ss-shadow)"/>
    <text x="72" y="104" class="d-tag">FOSS IQX</text>
    <text x="72" y="134" class="d-h">Supplier Quality</text>
    <g class="d-chip"><rect x="72" y="156" width="272" height="46" rx="10"/><text x="94" y="184" class="d-mod">Supplier information</text></g>
    <g class="d-chip"><rect x="72" y="212" width="272" height="46" rx="10"/><text x="94" y="240" class="d-mod">Audits &amp; complaints</text></g>
    <g class="d-chip"><rect x="72" y="268" width="272" height="46" rx="10"/><text x="94" y="296" class="d-mod">Questionnaires</text></g>

    <!-- customer -->
    <g filter="url(#ss-shadow)">
      <rect x="560" y="126" width="150" height="150" rx="18" fill="var(--bg-default)" stroke="var(--fg-primary)" stroke-width="1.6"/>
    </g>
    <path d="M592 210 h86 M592 210 v-34 l43 -24 l43 24 v34 Z" fill="none" stroke="var(--fg-primary)" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="606" y="188" width="18" height="18" rx="3" fill="var(--outline)"/>
    <rect x="646" y="188" width="18" height="18" rx="3" fill="var(--outline)"/>
    <rect x="626" y="216" width="18" height="24" rx="3" fill="var(--outline)"/>
    <text x="635" y="308" class="d-lbl" text-anchor="middle">Our customer</text>
    <text x="635" y="332" class="d-sub" text-anchor="middle">holds the licence</text>

    <path class="d-flow" d="M392 196 C 470 196, 500 200, 548 200" fill="none" stroke="var(--fg-faint)" stroke-width="1.8" marker-end="url(#ss-ar)"/>
    <text x="470" y="182" class="d-sub" text-anchor="middle">licence · paid</text>
  </g>

  <!-- STAGE 2 · the portal, included and free -->
  <g class="st" data-from="2">
    <rect x="72" y="326" width="272" height="52" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/>
    <text x="94" y="349" class="d-tag">Included · free for suppliers</text>
    <text x="94" y="369" class="d-lbl" style="font-size:16px">Supplier Portal</text>
  </g>

  <!-- STAGE 3 · the turn: it's for THEIR suppliers -->
  <g class="st" data-from="3">
    <rect x="936" y="96" width="224" height="238" rx="18" fill="var(--bg-default)" stroke="var(--outline)" filter="url(#ss-shadow)"/>
    ${[0, 1, 2].map((r) => `
      <g transform="translate(978, ${126 + r * 60})">
        <circle cx="16" cy="12" r="12" fill="none" stroke="var(--fg-primary)" stroke-width="1.6"/>
        <path d="M0 42 a16 16 0 0 1 32 0" fill="none" stroke="var(--fg-primary)" stroke-width="1.6"/>
        <text x="48" y="20" class="d-lbl" style="font-size:16px">Supplier ${r + 1}</text>
        <text x="48" y="38" class="d-sub">no FOSS account</text>
      </g>`).join('')}
    <text x="1048" y="318" class="d-tag" text-anchor="middle">the actual users</text>

    <!-- invitation arrows portal -> suppliers -->
    <path class="d-flow" d="M344 350 C 620 360, 760 210, 936 168" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#ss-arA)"/>
    <path class="d-flow" d="M344 352 C 640 364, 790 250, 936 234" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#ss-arA)"/>
    <path class="d-flow" d="M344 354 C 620 366, 780 300, 936 300" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#ss-arA)"/>

    <!-- not for the customer -->
    <g transform="translate(624, 150)">
      <circle cx="14" cy="14" r="15" fill="var(--bg-default)" stroke="var(--accent)" stroke-width="1.6"/>
      <path d="M8 8 L20 20 M20 8 L8 20" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <text x="500" y="118" class="d-x" text-anchor="middle">not for them</text>
  </g>

  <!-- STAGE 4 · both sides stuck -->
  <g class="st" data-from="4">
    <g filter="url(#ss-shadow)">
      <rect x="454" y="352" width="242" height="62" rx="14" fill="var(--bg-elevated)" stroke="var(--outline)"/>
      <path d="M504 352 l10 -14 l10 14 Z" fill="var(--bg-elevated)" stroke="var(--outline)"/>
    </g>
    <text x="474" y="382" class="d-bub">“I’ve got nothing</text>
    <text x="474" y="402" class="d-bub">to send them.”</text>

    <g filter="url(#ss-shadow)">
      <rect x="936" y="20" width="224" height="60" rx="14" fill="var(--accent-soft)" stroke="var(--accent)"/>
    </g>
    <text x="958" y="48" class="d-bub">“This is going</text>
    <text x="958" y="68" class="d-bub">to cost me.”</text>
  </g>

  <!-- STAGE 5 · the loop never closes -->
  <g class="st" data-from="5">
    <g transform="translate(726, 226)">
      <circle cx="18" cy="18" r="22" fill="var(--bg-default)" stroke="var(--accent)" stroke-width="2"/>
      <path d="M9 9 L27 27 M27 9 L9 27" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    </g>
    <text x="744" y="296" class="d-x" text-anchor="middle">never closes</text>
  </g>
</svg>`

export default function SupplierStory({ stage }: { stage: number }) {
  const ref = useRef<HTMLDivElement>(null)

  // Run after every render (not just on stage change) so the reveal survives a
  // hot-swap of the SVG markup and any re-mount. It's only five elements.
  useEffect(() => {
    const root = ref.current
    if (!root) return
    root.querySelectorAll<SVGGElement>('.st').forEach((g) => {
      const from = Number(g.getAttribute('data-from'))
      g.classList.toggle('on', from <= stage)
    })
  })

  return (
    <div className="ss">
      <div className="ss__diagram" ref={ref} dangerouslySetInnerHTML={{ __html: SVG }} />
      <div className="ss__cap">
        <div className="ss__dots" aria-hidden="true">
          {Array.from({ length: SUPPLIER_STAGES }, (_, n) => (
            <i key={n} className={n < stage ? 'on' : ''} />
          ))}
        </div>
        <p className="ss__text" dangerouslySetInnerHTML={{ __html: CAPS[stage - 1] ?? '' }} />
      </div>
    </div>
  )
}
