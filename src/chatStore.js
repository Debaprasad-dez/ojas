// Saved chats: one JSON array in localStorage, written through on every change.
// A tiny external store (read with useSyncExternalStore) so a reply lands in the chat it was
// sent from, even if the user has switched chats while waiting.
const KEY = 'chatter.chats.v1'
const enc = new TextEncoder()

const valid = (c) =>
  c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages)

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(data) ? data.filter(valid) : []
  } catch {
    return [] // unreadable or blocked storage: start empty rather than crash
  }
}

let state = { chats: load(), error: null }
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

function commit(chats) {
  let error = null
  try {
    localStorage.setItem(KEY, JSON.stringify(chats))
  } catch {
    // quota full or storage blocked: keep working in memory, and say so
    error = 'Storage is full, so new messages aren’t being saved. Delete a chat to free space.'
  }
  state = { chats, error }
  emit()
}

// another tab changed the chats: adopt its copy so neither tab overwrites the other
addEventListener('storage', (e) => {
  if (e.key !== KEY) return
  state = { chats: load(), error: null }
  emit()
})

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSnapshot = () => state

// randomUUID needs a secure context; plain-http LAN access falls back
const newId = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)

// Only the 10 most recent chats are kept; adding one past that drops the oldest.
export const MAX_CHATS = 10

// Keeps the newest MAX_CHATS, returns how many old ones fell off so the UI can say so.
function commitCapped(chats) {
  commit(chats.slice(0, MAX_CHATS))
  return Math.max(0, chats.length - MAX_CHATS)
}

// newest first, so the latest chat sits next to the "New" button
export function createChat(title) {
  const chat = { id: newId(), title: title.slice(0, 120), created: Date.now(), messages: [] }
  return { id: chat.id, evicted: commitCapped([chat, ...state.chats]) }
}

export function updateMessages(id, fn) {
  commit(state.chats.map((c) => (c.id === id ? { ...c, messages: fn(c.messages) } : c)))
}

export function deleteChat(id) {
  const index = state.chats.findIndex((c) => c.id === id)
  if (index < 0) return null
  const chat = state.chats[index]
  commit(state.chats.filter((c) => c.id !== id))
  return { chat, index }
}

// undo can land on a full list (a new chat was started meanwhile): the oldest then gives way
export function restoreChat(chat, index) {
  const chats = [...state.chats]
  chats.splice(Math.min(index, chats.length), 0, chat)
  return commitCapped(chats)
}

// UTF-8 bytes of the chat as stored
export const sizeKB = (chat) => enc.encode(JSON.stringify(chat)).length / 1024

// "2.4 KB": the sidebar's size label
export const kbLabel = (chat) => sizeKB(chat).toFixed(1) + ' KB'
