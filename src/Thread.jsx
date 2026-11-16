import { memo, useEffect, useRef, useState } from 'react'
import { Rich } from './blocks.jsx'
import { Icon } from './ui.jsx'

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function Acts({ copyable, canRedo, onRedo, onCopied }) {
  const [done, setDone] = useState(false)

  async function copy(e) {
    // the rendered answer as text, without these buttons
    const clone = e.currentTarget.closest('.ai-body').cloneNode(true)
    clone.querySelectorAll('.acts').forEach((n) => n.remove())
    try {
      await navigator.clipboard.writeText(clone.innerText.trim())
      setDone(true)
      onCopied('Answer copied')
      setTimeout(() => setDone(false), 1600)
    } catch {
      onCopied('Copying is blocked in this browser')
    }
  }

  return (
    <div className="acts">
      {copyable && (
        <button
          className={'iconbtn' + (done ? ' done' : '')}
          type="button"
          aria-label="Copy answer"
          title="Copy answer"
          onClick={copy}
        >
          <Icon name={done ? 'check' : 'copy'} />
        </button>
      )}
      {canRedo && (
        <button className="iconbtn" type="button" aria-label="Answer again" title="Answer again" onClick={onRedo}>
          <Icon name="refresh" />
        </button>
      )}
    </div>
  )
}

// one row; memoized so typing in the composer doesn't re-render (and rebuild) charts
const Message = memo(function Message({ m, i, fresh, last, canRedo, onRedo, onCopied }) {
  if (m.role === 'user') {
    return (
      <article className={'msg user' + (fresh ? ' in' : '')} data-i={i}>
        <div className="bubble">{m.content}</div>
      </article>
    )
  }
  const redo = last && canRedo
  let body
  if (m.role === 'assistant') body = <Rich text={m.content} />
  else if (m.role === 'stopped') body = <p className="stopped">Stopped. Ask again to get the full answer.</p>
  else body = <p className="err-text">Couldn’t get an answer. {m.content}</p>
  return (
    <article className={'msg ai' + (m.role === 'error' ? ' err' : '') + (fresh ? ' in' : '')} data-i={i}>
      <span className="mk" aria-hidden="true" />
      <div className="ai-body">
        {body}
        {(m.role === 'assistant' || redo) && (
          <Acts copyable={m.role === 'assistant'} canRedo={redo} onRedo={onRedo} onCopied={onCopied} />
        )}
      </div>
    </article>
  )
})

// scroll: { kind: 'top' | 'bottom', n } — a new value applies once (open a chat → top, send → bottom)
export default function Thread({
  messages,
  thinking,
  freshFrom,
  scroll,
  swapping,
  canRedo,
  onRedo,
  onCopied,
  threadRef,
}) {
  const stick = useRef(true)
  const [jump, setJump] = useState(false)
  // a new scroll intent (opened a chat, sent a message) clears a "Latest" left from before
  const [seen, setSeen] = useState(scroll)
  if (scroll !== seen) {
    setSeen(scroll)
    setJump(false)
  }

  const toBottom = (smooth) => {
    const t = threadRef.current
    if (!t) return
    stick.current = true
    t.scrollTo({ top: t.scrollHeight, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    const t = threadRef.current
    if (!t || !scroll) return
    if (scroll.kind === 'top') {
      t.scrollTop = 0
      stick.current = false
    } else toBottom(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per scroll intent
  }, [scroll])

  // keep following the conversation while you're at the bottom
  useEffect(() => {
    if (stick.current) threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages.length, thinking, threadRef])

  return (
    <>
      <section
        className={'thread' + (swapping ? ' swap' : '')}
        ref={threadRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        onScroll={(e) => {
          const t = e.currentTarget
          stick.current = t.scrollHeight - t.scrollTop - t.clientHeight < 90
          setJump(!stick.current)
        }}
      >
        <div className="thread-inner colw">
          {messages.map((m, i) => (
            <Message
              key={i}
              m={m}
              i={i}
              fresh={i >= freshFrom}
              last={i === messages.length - 1 && !thinking}
              canRedo={canRedo}
              onRedo={onRedo}
              onCopied={onCopied}
            />
          ))}
          {thinking && (
            <article className="msg ai thinking in" role="status">
              <span className="mk" aria-hidden="true" />
              <div className="ai-body">
                <p className="think">Thinking</p>
              </div>
            </article>
          )}
        </div>
      </section>
      <button className={'jump' + (jump ? ' show' : '')} type="button" onClick={() => toBottom(true)}>
        <Icon name="down" />
        Latest
      </button>
    </>
  )
}
