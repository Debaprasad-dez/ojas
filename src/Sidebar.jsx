import { useMemo, useState } from 'react'
import { kbLabel } from './chatStore.js'
import { plainText } from './text.js'
import { Icon } from './ui.jsx'
import logo from './assets/ojas-logo-side.webp'

// a chat matches if the query is in its title or in any of its messages
const matches = (chat, q) =>
  chat.title.toLowerCase().includes(q) ||
  chat.messages.some((m) => m.role !== 'error' && plainText(m.content ?? '').toLowerCase().includes(q))

export function Avatar({ profile, className = '' }) {
  const { name, photo } = profile
  return (
    <span
      className={'avatar ' + className + (photo ? ' has-photo' : '')}
      style={photo ? { backgroundImage: `url(${photo})` } : undefined}
      aria-hidden="true"
    >
      {(name.trim()[0] || '?').toUpperCase()}
    </span>
  )
}

export default function Sidebar({
  chats,
  activeId,
  freshId,
  profile,
  profileOpen,
  searchRef,
  meRef,
  onNew,
  onOpen,
  onDelete,
  onProfile,
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const list = useMemo(() => (q ? chats.filter((c) => matches(c, q)) : chats), [chats, q])
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <aside className="side" aria-label="Chats and profile">
      <a
        className="brand"
        href="#"
        aria-label="Ojas One, start a new chat"
        onClick={(e) => {
          e.preventDefault()
          onNew()
        }}
      >
        <img src={logo} width="133" height="30" alt="Ojas One" />
      </a>

      <button className="newchat" type="button" onClick={onNew}>
        <Icon name="plus" />
        New chat
      </button>

      <label className="search">
        <Icon name="search" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder="Search chats"
          aria-label="Search chats"
          autoComplete="off"
          spellCheck="false"
        />
        <kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
      </label>

      <div className="side-head">
        <h2>Chats</h2>
        <span className="num">{chats.length || ''}</span>
      </div>
      <nav className="chats" aria-label="Chats">
        {!list.length ? (
          <p className="chats-empty">
            {chats.length ? `No chats match “${query.trim()}”.` : 'No chats yet. Ask a question to start one.'}
          </p>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className={'chat' + (c.id === activeId ? ' active' : '') + (c.id === freshId ? ' new' : '')}
            >
              <button
                className="chat-open"
                type="button"
                aria-current={c.id === activeId ? 'page' : undefined}
                onClick={() => onOpen(c.id)}
              >
                <span className="chat-title">{c.title}</span>
                <span className="chat-size num">{c.messages.length ? kbLabel(c) : ''}</span>
              </button>
              <button
                className="chat-del"
                type="button"
                aria-label={`Delete chat: ${c.title}`}
                onClick={() => onDelete(c.id)}
              >
                <Icon name="x" />
              </button>
            </div>
          ))
        )}
      </nav>

      <button
        ref={meRef}
        className="me"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={profileOpen}
        aria-label={profile.name ? `Edit profile: ${profile.name}` : 'Add your name and email'}
        onClick={onProfile}
      >
        <Avatar profile={profile} />
        <span className="me-text">
          <span className="me-name">{profile.name || 'Add your name'}</span>
          <span className="me-mail">{profile.email || (profile.name ? 'Add your email' : 'Name, email and photo')}</span>
        </span>
        <Icon name="pencil" />
      </button>
    </aside>
  )
}
