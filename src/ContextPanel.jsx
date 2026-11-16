import { memo } from 'react'
import { MAX_CONTEXT, contextState } from './conversation.js'
import { heat } from './heat.js'
import { plainText } from './text.js'
import { Icon } from './ui.jsx'

const METER = Array.from({ length: MAX_CONTEXT }, (_, i) => heat(i / (MAX_CONTEXT - 1)))

export const MiniMeter = memo(function MiniMeter({ n }) {
  return (
    <span className="mini" aria-hidden="true">
      {METER.map((c, i) => (
        <i key={i} style={i < n ? { background: c } : undefined} />
      ))}
    </span>
  )
})

const ContextPanel = memo(function ContextPanel({ messages, freshFrom, draft, open, onClose, onJump }) {
  const { vis, n, older, leaving } = contextState(messages)

  let note
  if (!n) note = 'Empty for now. Once you get a reply, the conversation collects here and is sent along with each new message.'
  else if (n >= MAX_CONTEXT) note = 'Full. The two oldest messages drop out when you send the next one.'
  else note = 'Sent along with your next message. The oldest drop out first.'
  if (older) note += ` ${older} older message${older > 1 ? 's are' : ' is'} no longer sent.`

  return (
    <aside className="ctx" id="ctx" aria-label="Context" inert={!open}>
      <div className="ctx-inner">
        <div className="ctx-head">
          <h2>Context</h2>
          <button className="iconbtn" type="button" aria-label="Close context" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="ctx-count">
          <span>Messages the model can see</span>
          <b className="num">
            {n} of {MAX_CONTEXT}
          </b>
        </div>
        <div className="meter" role="img" aria-label={`${n} of ${MAX_CONTEXT} messages in context`}>
          {METER.map((c, i) => (
            <i
              key={i}
              className={(i < n ? 'on' : '') + (i === n - 1 ? ' tip' : '')}
              style={{ '--c': c, '--i': i }}
            />
          ))}
        </div>
        <p className="ctx-note">{note}</p>
        <ol className="ctx-list">
          {vis.map(([m, i], k) => (
            <li key={i}>
              <button
                type="button"
                className={
                  'ctx-row ' +
                  (m.role === 'user' ? 'you' : 'ai') +
                  (k < leaving ? ' drops' : '') +
                  (i >= freshFrom ? ' fresh' : '')
                }
                style={{ '--n': Math.max(0, k - (n - 2)) }}
                onClick={() => onJump(i)}
              >
                <span className="who">{m.role === 'user' ? 'You' : 'AI'}</span>
                <span className="snip">{plainText(m.content)}</span>
                {k < leaving && <span className="tag">drops next</span>}
              </button>
            </li>
          ))}
        </ol>
        <div className={'ctx-next' + (draft.trim() ? ' live' : '')}>
          <span className="who">Next</span>
          <span className="snip">{draft.trim() || 'Your new message'}</span>
        </div>
      </div>
    </aside>
  )
})

export default ContextPanel
