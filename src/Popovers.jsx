import { useEffect, useRef, useState } from 'react'
import { MODELS, MODEL_NOTES, modelName } from './hf.js'
import { LEVELS } from './prompt.js'
import { toAvatar } from './profile.js'
import { Avatar } from './Sidebar.jsx'
import { Icon, Popover } from './ui.jsx'

const LEVEL_KEYS = Object.keys(LEVELS)

// Today's topics as chips (welcome screen and the topics popover). A click asks about it.
export function TopicChips({ topics, status, onPick, onRetry }) {
  if (!topics && status === 'error') {
    return (
      <p className="chips-note" role="alert">
        Couldn’t reach Wikipedia.{' '}
        <button type="button" className="linkbtn" onClick={onRetry}>
          Try again
        </button>
      </p>
    )
  }
  if (!topics) {
    return (
      <div className="chips" aria-busy="true">
        {[96, 72, 120, 84, 64, 108, 78].map((w, i) => (
          <span key={i} className="chip chip-skel" style={{ width: w, '--i': i }} aria-hidden="true" />
        ))}
      </div>
    )
  }
  return (
    <div className="chips" aria-busy={status === 'loading'}>
      {topics.map((t, i) => (
        <button key={t} className="chip" type="button" style={{ '--i': i }} title={t} onClick={() => onPick(t)}>
          {t}
        </button>
      ))}
    </div>
  )
}

// a one-shot spin on the refresh icon, replayed on each click
export function Reroll({ onClick, disabled }) {
  const [spin, setSpin] = useState(0)
  return (
    <button
      key={spin}
      className={'iconbtn' + (spin ? ' spin-once' : '')}
      type="button"
      aria-label="Show different topics"
      title="Show different topics"
      disabled={disabled}
      onClick={() => {
        setSpin((s) => s + 1)
        onClick()
      }}
    >
      <Icon name="refresh" />
    </button>
  )
}

export function ModelPop({ open, anchorRef, model, level, onModel, onLevel }) {
  const at = LEVEL_KEYS.indexOf(level)
  return (
    <Popover id="popModel" open={open} anchorRef={anchorRef} label="Model and answer length">
      <span className="pop-label" id="lblModel">
        Model
      </span>
      <div role="radiogroup" aria-labelledby="lblModel">
        {MODELS.map((m) => (
          <button
            key={m}
            className="opt"
            type="button"
            role="radio"
            aria-checked={m === model}
            onClick={() => onModel(m)}
          >
            <span className="dot" />
            <span>
              <b>{modelName(m)}</b>
              <span>{MODEL_NOTES[m] ?? ''}</span>
            </span>
          </button>
        ))}
      </div>
      <span className="pop-label" id="lblElab">
        Answer length
      </span>
      <div className="seg" role="radiogroup" aria-labelledby="lblElab">
        <span className="seg-thumb" aria-hidden="true" style={{ '--at': at }} />
        {LEVEL_KEYS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={k === level} onClick={() => onLevel(k)}>
            {LEVELS[k].label}
          </button>
        ))}
      </div>
      <p className="seg-note">
        Up to {LEVELS[level].maxTokens.toLocaleString('en')} tokens, {LEVELS[level].words}.
      </p>
    </Popover>
  )
}

export function TopicsPop({ open, anchorRef, topics, status, onPick, onRefresh }) {
  return (
    <Popover id="popTopics" open={open} anchorRef={anchorRef} label="Topics you can learn today">
      <div className="pop-row">
        <h2>Topics you can learn today</h2>
        <Reroll onClick={onRefresh} disabled={status === 'loading'} />
      </div>
      <TopicChips topics={topics} status={status} onPick={onPick} onRetry={onRefresh} />
    </Popover>
  )
}

// Edit profile. Starts from the saved profile each time it opens; Cancel, Esc or a click
// outside discards the draft. The photo is cropped and shrunk before it's kept.
export function ProfilePop({ open, anchorRef, profile, onSave, onCancel }) {
  const [draft, setDraft] = useState(profile)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const nameRef = useRef(null)
  const [opened, setOpened] = useState(open)

  // reset the draft whenever it opens (render-time state sync, not an effect)
  if (open !== opened) {
    setOpened(open)
    if (open) {
      setDraft(profile)
      setError('')
    }
  }

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 40)
    return () => clearTimeout(t)
  }, [open])

  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // picking the same file again should still fire
    if (!file) return
    try {
      const photo = await toAvatar(file)
      setDraft((d) => ({ ...d, photo }))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  function save() {
    const name = draft.name.trim()
    if (!name) {
      nameRef.current?.focus()
      setError('Add your name to save.')
      return
    }
    const email = draft.email.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('That email doesn’t look right.')
      return
    }
    const err = onSave({ name, email, photo: draft.photo })
    if (err) setError(err)
  }

  return (
    <Popover id="popMe" open={open} anchorRef={anchorRef} label="Edit profile">
      <h2>Edit profile</h2>
      <div className="photo-row">
        <Avatar profile={draft} />
        <div>
          <button className="linkbtn" type="button" onClick={() => fileRef.current.click()}>
            {draft.photo ? 'Change photo' : 'Upload photo'}
          </button>
          {draft.photo && (
            <button className="linkbtn quiet" type="button" onClick={() => setDraft((d) => ({ ...d, photo: '' }))}>
              Remove
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
        </div>
      </div>
      <label className="field-l" htmlFor="fName">
        Name
      </label>
      <input
        ref={nameRef}
        className="inp"
        id="fName"
        type="text"
        autoComplete="name"
        maxLength={60}
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <label className="field-l" htmlFor="fMail">
        Email
      </label>
      <input
        className="inp"
        id="fMail"
        type="email"
        autoComplete="email"
        maxLength={120}
        value={draft.email}
        onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      {error ? (
        <p className="help err" role="alert">
          {error}
        </p>
      ) : (
        <p className="help">Saved in this browser only.</p>
      )}
      <div className="pop-actions">
        <button className="btn ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn solid" type="button" onClick={save}>
          Save
        </button>
      </div>
    </Popover>
  )
}
