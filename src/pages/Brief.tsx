import { useState } from 'react'

const BRIEF_TEXT = `Brief: FOSS IQX Supplier Portal

Audience: a supplier of one of our customers. They didn't ask for this. They assume it will cost them money. They have no relationship with FOSS.

Three things they must understand: it's free for them · they need their own account, for security · what they'll actually use it for — documents, questionnaires, complaints, audits.

Tone: human, not marketing. Write in "you".

Pick one: a one-page PDF a customer can co-brand and forward · a section for iqx.net · a social post aimed at customers, telling them to forward the link.

Don't: promise support. Invent numbers. Use € or $. Write to the buyer.`

export function Brief() {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(BRIEF_TEXT)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard may be blocked — the brief is on screen regardless */
    }
  }

  return (
    <div className="brief">
      <div className="brief__head">
        <span className="brief__title">Brief · FOSS IQX Supplier Portal</span>
        <button type="button" className="brief__copy" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <dl className="brief__grid">
        <div>
          <dt>Audience</dt>
          <dd>
            A supplier of one of our customers. They didn't ask for this. They assume it will cost
            them money. They have no relationship with FOSS.
          </dd>
        </div>
        <div>
          <dt>They must understand</dt>
          <dd>
            It's free for them · they need their own account, for security · what they'll actually
            use it for — documents, questionnaires, complaints, audits.
          </dd>
        </div>
        <div>
          <dt>Tone</dt>
          <dd>Human, not marketing. Write in “you”.</dd>
        </div>
        <div>
          <dt>Pick one</dt>
          <dd>
            A one-page PDF a customer can co-brand and forward · a section for iqx.net · a social
            post aimed at <em>customers</em>, telling them to forward the link.
          </dd>
        </div>
        <div className="brief__dont">
          <dt>Don't</dt>
          <dd>Promise support. Invent numbers. Use € or $. Write to the buyer.</dd>
        </div>
      </dl>
    </div>
  )
}
