import { useLayoutEffect } from 'react'
import { modelName } from './hf.js'
import { LEVELS } from './prompt.js'
import { Icon } from './ui.jsx'

const MAX_HEIGHT = 200 // px of typing before the box scrolls instead of growing

// The message box. While a reply is pending the send button becomes stop.
export default function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  chatView,
  model,
  level,
  inputRef,
  modelBtnRef,
  topicsBtnRef,
  modelOpen,
  topicsOpen,
  onModel,
  onTopics,
  onFocusChange,
}) {
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value, inputRef])

  return (
    <form
      className="composer"
      data-busy={busy || undefined}
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault()
        if (busy) onStop()
        else onSend(value)
      }}
      // a click on the card's padding (not a control) puts the cursor in the text box
      onPointerDown={(e) => {
        if (e.target === e.currentTarget || e.target.classList.contains('composer-row')) {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }}
    >
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter breaks the line; never interrupt IME composition
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            if (!busy) onSend(value)
          }
        }}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder={chatView ? 'Ask a follow-up' : 'Ask anything'}
        aria-label="Message"
      />
      <div className="composer-row">
        <button
          ref={modelBtnRef}
          className="pill"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={modelOpen}
          aria-label="Model and answer length"
          onClick={onModel}
        >
          <Icon name="sliders" />
          <span>{modelName(model)}</span>
          <i className="sep" />
          <span className="elab-label">{LEVELS[level].label}</span>
          <Icon name="chev" className="chev" />
        </button>
        <button
          ref={topicsBtnRef}
          className="pill topics-btn"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={topicsOpen}
          aria-label="Topics you can learn today"
          onClick={onTopics}
        >
          <Icon name="book" />
          <span className="lbl">Today's topics</span>
        </button>
        <button
          className="send"
          type="submit"
          aria-label={busy ? 'Stop answering' : 'Send message'}
          disabled={!busy && !value.trim()}
        >
          <Icon name="up" className="i-up" />
          <Icon name="stop" className="i-stop" />
        </button>
      </div>
    </form>
  )
}
