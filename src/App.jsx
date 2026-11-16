import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { chat, MODELS } from './hf.js'
import { LEVELS, systemPrompt } from './prompt.js'
import {
  createChat,
  deleteChat,
  getSnapshot,
  kbLabel,
  MAX_CHATS,
  restoreChat,
  subscribe,
  updateMessages,
} from './chatStore.js'
import { contextOf, contextState, MAX_CONTEXT, titleFrom, trimToComplete } from './conversation.js'
import { loadProfile, saveProfile } from './profile.js'
import { useTopics } from './topics.js'
import Field from './Field.jsx'
import Sidebar from './Sidebar.jsx'
import Hero from './Hero.jsx'
import Thread from './Thread.jsx'
import Composer from './Composer.jsx'
import ContextPanel, { MiniMeter } from './ContextPanel.jsx'
import { ModelPop, ProfilePop, Reroll, TopicChips, TopicsPop } from './Popovers.jsx'
import { Icon, IconSprite, Toast } from './ui.jsx'
import barLogo from './assets/ojas-logo-bar.webp'

const NO_MESSAGES = [] // stable empty list for a new chat, so memoized children don't re-render
const UNDO_MS = 5000
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const sleep = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 1) : ms))
const wide = () => innerWidth >= 1180 // the context panel sits beside the chat from here up
const finePointer = () => matchMedia('(pointer: fine)').matches

export default function App() {
  const { chats, error: storageError } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [activeId, setActiveIdState] = useState(null) // null = a new chat, saved on its first message
  const [view, setViewState] = useState('welcome') // follows the chat, but animated: see toChat()
  const [phase, setPhase] = useState(null) // 'leaving' | 'closing' during the welcome ↔ chat hand-off
  const [swapping, setSwapping] = useState(false) // thread fades while switching between chats
  const [pending, setPending] = useState(null) // id of the chat awaiting a reply; one at a time
  const [fresh, setFresh] = useState({ id: null, from: Infinity }) // messages from here animate in
  const [freshChat, setFreshChat] = useState(null) // a newly created chat's sidebar row animates in
  const [scroll, setScroll] = useState(null) // { kind: 'top' | 'bottom', n }
  const [text, setText] = useState('')
  const [model, setModel] = useState(MODELS[0])
  const [level, setLevel] = useState('concise')
  const [profile, setProfile] = useState(loadProfile)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [nav, setNav] = useState(false) // small screens: the sidebar drawer
  const [pop, setPop] = useState(null) // 'model' | 'topics' | 'me'
  const [toast, setToast] = useState(null) // { id, text, undo, show }
  const [typing, setTyping] = useState(false) // composer focused: the field rises a touch
  const [rerolled, setRerolled] = useState(false)
  const topics = useTopics()

  const activeRef = useRef(null)
  const viewRef = useRef('welcome')
  const ctxPref = useRef(null) // 'open' | 'closed' once the user has toggled the panel
  const abortRef = useRef(null)
  const answering = useRef(null) // the in-flight answer, so a chat switch can wait for it
  const toastTimer = useRef(0)
  const stageRef = useRef(null)
  const dockRef = useRef(null)
  const inputRef = useRef(null)
  const threadRef = useRef(null)
  const searchRef = useRef(null)
  const meRef = useRef(null)
  const modelBtnRef = useRef(null)
  const topicsBtnRef = useRef(null)
  const ctxToggleRef = useRef(null)

  // refs mirror state that async handlers read after awaiting
  const setActiveId = (id) => {
    activeRef.current = id
    setActiveIdState(id)
  }
  const setView = (v) => {
    viewRef.current = v
    setViewState(v)
  }

  // activeId can outlive its chat (deleted in another tab): treat that as a new chat
  const active = chats.find((c) => c.id === activeId)
  const messages = active?.messages ?? NO_MESSAGES
  const busy = pending !== null
  const thinking = busy && pending === activeId
  const chatView = view === 'chat'
  const { n: ctxN } = contextState(messages)

  // ── toasts ──
  const showToast = useCallback((text, undo) => {
    clearTimeout(toastTimer.current)
    const id = Date.now()
    setToast({ id, text, undo, show: true })
    toastTimer.current = setTimeout(
      () => setToast((t) => (t?.id === id ? { ...t, show: false } : t)),
      undo ? UNDO_MS : 2200,
    )
  }, [])
  // storage trouble stays up until it's resolved
  const shownToast = storageError ? { text: storageError, show: true } : toast

  // the store keeps only MAX_CHATS; when the oldest give way, say so instead of losing them silently
  function noteEvicted(n) {
    if (n) showToast(`Removed the ${n > 1 ? `${n} oldest chats` : 'oldest chat'} (${MAX_CHATS} max)`)
  }

  // ── welcome ↔ chat: the dock glides (FLIP) while hero and topics fade ──
  function flip(mutate) {
    const node = dockRef.current
    const a = node.getBoundingClientRect()
    flushSync(mutate)
    const b = node.getBoundingClientRect()
    if (reducedMotion()) return
    node.animate(
      [{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)` }, { transform: 'none' }],
      { duration: 760, easing: 'cubic-bezier(.22,.8,.24,1)' },
    )
  }
  async function toChat() {
    if (viewRef.current === 'chat') return
    setPhase('leaving')
    await sleep(240)
    flip(() => {
      setView('chat')
      setPhase(null)
    })
  }
  async function toWelcome(alsoDo) {
    if (viewRef.current === 'welcome') return alsoDo?.()
    setPhase('closing')
    await sleep(180)
    setRerolled(false)
    flip(() => {
      alsoDo?.()
      setView('welcome')
      setPhase(null)
    })
  }

  // ── context panel: opens beside a conversation on wide screens unless you closed it ──
  function autoCtx(msgs) {
    if (msgs.length >= 2) {
      if (wide() && ctxPref.current !== 'closed') setCtxOpen(true)
    } else if (ctxPref.current !== 'open' || !wide()) setCtxOpen(false)
  }
  function toggleCtx(open) {
    ctxPref.current = open ? 'open' : 'closed'
    setCtxOpen(open)
  }

  const focusInput = () => finePointer() && inputRef.current?.focus({ preventScroll: true })

  // wait for an in-flight answer to stop before switching chats
  async function settle() {
    if (abortRef.current) {
      abortRef.current.abort()
      await answering.current
    }
  }

  async function openChat(id) {
    if (id === activeRef.current) return setNav(false)
    await settle()
    setPop(null)
    setNav(false)
    const chat = getSnapshot().chats.find((c) => c.id === id)
    if (!chat) return
    if (viewRef.current === 'chat') {
      setSwapping(true)
      await sleep(140)
    }
    flushSync(() => {
      setActiveId(id)
      setFresh({ id: null, from: Infinity })
      setScroll({ kind: 'top', n: Date.now() })
    })
    setSwapping(false)
    await toChat()
    autoCtx(chat.messages)
    focusInput()
  }

  async function newChat() {
    await settle()
    setPop(null)
    setNav(false)
    await toWelcome(() => setActiveId(null))
    autoCtx([])
    focusInput()
  }

  // ── asking ──
  async function answer(id, history) {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setPending(id)
    const run = (async () => {
      try {
        const { content, finish_reason } = await chat(
          {
            model,
            messages: [{ role: 'system', content: systemPrompt(level) }, ...history],
            max_tokens: LEVELS[level].maxTokens,
          },
          ctrl.signal,
        )
        // over the elaboration budget: end cleanly at the last complete sentence, no notice
        const reply = finish_reason === 'length' ? trimToComplete(content) : content
        updateMessages(id, (m) => [...m, { role: 'assistant', content: reply }])
      } catch (err) {
        // stopped / failed entries are UI-only: never sent, and they take their question with them
        updateMessages(id, (m) => [
          ...m,
          ctrl.signal.aborted ? { role: 'stopped', content: '' } : { role: 'error', content: err.message },
        ])
      } finally {
        abortRef.current = null
        setPending(null)
        const chat = getSnapshot().chats.find((c) => c.id === id)
        if (chat && activeRef.current === id) autoCtx(chat.messages)
      }
    })()
    answering.current = run
    await run
  }

  async function send(raw) {
    const content = (raw ?? '').trim()
    if (!content || abortRef.current || pending) return
    setPop(null)
    setText('')
    const user = { role: 'user', content }
    const prior = active?.messages ?? []
    // dev only: "/demo" shows a sample reply with every block type, no API call
    const demo = import.meta.env.DEV && content === '/demo' ? (await import('./demo.md?raw')).default : null
    // every write below targets this id, so the reply lands here even if the user switches chats
    let id = active?.id
    if (!id) {
      const created = createChat(titleFrom(content))
      id = created.id
      noteEvicted(created.evicted)
      setActiveId(id)
      setFreshChat(id)
      setFresh({ id, from: 0 })
      await toChat()
    } else setFresh((f) => (f.id === id ? f : { id, from: prior.length }))
    updateMessages(id, (m) => [...m, user])
    setScroll({ kind: 'bottom', n: Date.now() })
    if (demo) {
      updateMessages(id, (m) => [...m, { role: 'assistant', content: demo }])
      autoCtx(getSnapshot().chats.find((c) => c.id === id)?.messages ?? [])
      return
    }
    await answer(id, [...contextOf(prior), user])
  }

  // "Answer again": drop the last reply (or stopped/failed entry) and ask the same question
  async function regenerate() {
    if (!active || busy) return
    const msgs = active.messages
    const user = msgs.at(-2)
    if (!msgs.length || msgs.at(-1).role === 'user' || user?.role !== 'user') return
    const id = active.id
    updateMessages(id, (m) => m.slice(0, -1))
    setFresh({ id, from: msgs.length - 1 })
    setScroll({ kind: 'bottom', n: Date.now() })
    await answer(id, [...contextOf(msgs.slice(0, -2)), user])
  }

  async function removeChat(id) {
    const wasActive = id === activeRef.current
    if (wasActive) await settle()
    const removed = deleteChat(id)
    if (!removed) return
    if (wasActive) await newChat()
    showToast('Chat deleted', () => {
      noteEvicted(restoreChat(removed.chat, removed.index))
      if (wasActive) openChat(removed.chat.id)
    })
  }

  function saveMyProfile(next) {
    try {
      saveProfile(next)
    } catch {
      return 'Browser storage is full, so this couldn’t be saved.'
    }
    setProfile(next)
    setPop(null)
    meRef.current?.focus({ preventScroll: true })
    showToast('Profile saved')
  }

  // ── popovers: one at a time; a second click on the trigger closes it ──
  const anchors = { model: modelBtnRef, topics: topicsBtnRef, me: meRef }
  function togglePop(name) {
    if (pop === name) {
      setPop(null)
      anchors[name].current?.focus({ preventScroll: true })
    } else setPop(name)
  }

  useEffect(() => {
    if (!pop) return
    const anchor = { model: modelBtnRef, topics: topicsBtnRef, me: meRef }[pop].current
    const outside = (e) => {
      if (!e.target.closest('.pop') && !anchor?.contains(e.target)) setPop(null)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [pop])

  // Esc closes the innermost thing open; Ctrl/⌘ K searches chats
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (pop) {
          setPop(null)
          return { model: modelBtnRef, topics: topicsBtnRef, me: meRef }[pop].current?.focus()
        }
        if (nav) return setNav(false)
        if (ctxOpen && !wide()) return toggleCtx(false)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setNav(true)
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pop, nav, ctxOpen])

  // narrowing the window tucks the panel away unless you opened it yourself
  useEffect(() => {
    const onResize = () => !wide() && ctxPref.current !== 'open' && setCtxOpen(false)
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.title = active ? `${active.title} | Ojas One` : 'Ojas One'
  }, [active])

  // ready to type on desktop
  useEffect(() => {
    if (finePointer() && innerWidth > 860) inputRef.current?.focus({ preventScroll: true })
  }, [])

  function jumpTo(i) {
    const t = threadRef.current
    const target = t?.querySelector(`.msg[data-i="${i}"]`)
    if (!target) return
    const top = t.scrollTop + target.getBoundingClientRect().top - t.getBoundingClientRect().top - 30
    t.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' })
    if (!wide()) toggleCtx(false)
  }

  const learn = (topic) => send(`Let's learn about ${topic}`)
  const refreshTopics = () => {
    setRerolled(true)
    topics.refresh()
  }

  return (
    <>
      <IconSprite />
      <Field mode={chatView ? 1 : 0} energy={thinking ? 1 : 0} rise={typing ? 1.03 : 1} anchorRef={stageRef} />
      <div className="grain" aria-hidden="true" />

      <div
        className="app"
        data-view={view}
        data-phase={phase || undefined}
        data-ctx={ctxOpen ? 'open' : 'closed'}
        data-nav={nav ? 'open' : 'closed'}
      >
        <Sidebar
          chats={chats}
          activeId={active ? activeId : null}
          freshId={freshChat}
          profile={profile}
          profileOpen={pop === 'me'}
          searchRef={searchRef}
          meRef={meRef}
          onNew={newChat}
          onOpen={openChat}
          onDelete={removeChat}
          onProfile={() => togglePop('me')}
        />

        <main className="stage" ref={stageRef}>
          <header className="bar">
            <button className="iconbtn nav-toggle" type="button" aria-label="Open chats" onClick={() => setNav((v) => !v)}>
              <Icon name="menu" />
            </button>
            <img className="bar-brand" src={barLogo} width="88" height="22" alt="Ojas One" />
            <div className="bar-title">
              <h1>{active?.title ?? ''}</h1>
              <p>{active && messages.length ? `${messages.length} message${messages.length > 1 ? 's' : ''}, ${kbLabel(active)}` : ''}</p>
            </div>
            <button
              ref={ctxToggleRef}
              className="ctx-toggle"
              type="button"
              aria-expanded={ctxOpen}
              aria-controls="ctx"
              onClick={() => toggleCtx(!ctxOpen)}
            >
              <MiniMeter n={ctxN} />
              <span>Context</span>
              <span className="num">
                {ctxN}/{MAX_CONTEXT}
              </span>
            </button>
          </header>

          <Hero active={view === 'welcome' && !phase} onPick={(t) => send(`Teach me about ${t}`)} />

          <Thread
            messages={messages}
            thinking={thinking}
            freshFrom={fresh.id === activeId ? fresh.from : Infinity}
            scroll={scroll}
            swapping={swapping}
            canRedo={!busy}
            onRedo={regenerate}
            onCopied={showToast}
            threadRef={threadRef}
          />

          <div className="dock colw" ref={dockRef}>
            <Composer
              value={text}
              onChange={setText}
              onSend={send}
              onStop={() => abortRef.current?.abort()}
              busy={busy}
              chatView={chatView}
              model={model}
              level={level}
              inputRef={inputRef}
              modelBtnRef={modelBtnRef}
              topicsBtnRef={topicsBtnRef}
              modelOpen={pop === 'model'}
              topicsOpen={pop === 'topics'}
              onModel={() => togglePop('model')}
              onTopics={() => togglePop('topics')}
              onFocusChange={setTyping}
            />
            <p className="keys">
              <kbd>Enter</kbd> to send, <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
            </p>
            <p className="fine">Ojas One can get things wrong. Check anything important.</p>
          </div>

          <section className={'below colw' + (rerolled ? ' rerolled' : '')} aria-label="Topics you can learn today">
            <div className="below-head">
              <h2>Topics you can learn today</h2>
              <Reroll onClick={refreshTopics} disabled={topics.status === 'loading'} />
            </div>
            <TopicChips
              key={topics.generation}
              topics={topics.topics}
              status={topics.status}
              onPick={learn}
              onRetry={refreshTopics}
            />
          </section>
        </main>

        <ContextPanel
          messages={messages}
          freshFrom={fresh.id === activeId ? fresh.from : Infinity}
          draft={text}
          open={ctxOpen}
          onClose={() => {
            toggleCtx(false)
            ctxToggleRef.current?.focus()
          }}
          onJump={jumpTo}
        />

        <div
          className="scrim"
          onClick={() => {
            setNav(false)
            if (!wide()) toggleCtx(false)
          }}
        />
      </div>

      <ModelPop
        open={pop === 'model'}
        anchorRef={modelBtnRef}
        model={model}
        level={level}
        onModel={setModel}
        onLevel={setLevel}
      />
      <TopicsPop
        open={pop === 'topics'}
        anchorRef={topicsBtnRef}
        topics={topics.topics}
        status={topics.status}
        onPick={learn}
        onRefresh={refreshTopics}
      />
      <ProfilePop
        open={pop === 'me'}
        anchorRef={meRef}
        profile={profile}
        onSave={saveMyProfile}
        onCancel={() => {
          setPop(null)
          meRef.current?.focus({ preventScroll: true })
        }}
      />
      <Toast
        toast={shownToast}
        onAct={() => {
          toast?.undo?.()
          setToast((t) => t && { ...t, show: false })
        }}
      />
    </>
  )
}
